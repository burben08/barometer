# %%
import requests
import json
import time
import os

# --- Configuration ---
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OUTPUT_FILE = "bar_density_grid.json"

# -- Your new 2-grid settings --
LARGE_LAT_STEP = 10.0
LARGE_LON_STEP = 10.0
FINAL_LAT_STEP = 2.0
FINAL_LON_STEP = 2.0
# ------------------------------

# Globe boundaries
LAT_MIN, LAT_MAX = -90.0, 90.0
LON_MIN, LON_MAX = -180.0, 180.0

# General settings
BASE_SLEEP_SECONDS = 2
MAX_RECURSION_DEPTH = 3 # 2.0 -> 1.0 -> 0.5 -> 0.25
QUERY_TIMEOUT_SECONDS = 20 
# --- End Configuration ---

def load_existing_data(filename):
    """Loads existing grid data if the file exists."""
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"Warning: {filename} is corrupt. Starting a new file.")
            return {}
    return {}

def save_data(filename, data):
    """Saves the grid data to the JSON file."""
    try:
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
    except IOError as e:
        print(f"Error: Could not write to file {filename}: {e}")

def fetch_bar_count(s, w, n, e):
    """
    Fetches the *count* of bars/pubs.
    Only sleeps if the count is greater than 0.
    """
    query = f"""
        [out:json][timeout:{QUERY_TIMEOUT_SECONDS}];
        (
          node["amenity"="bar"]({s},{w},{n},{e});
          node["amenity"="pub"]({s},{w},{n},{e});
        );
        out count;
    """
    
    retries = 3
    sleep_time = BASE_SLEEP_SECONDS
    
    for attempt in range(retries):
        try:
            response = requests.post(OVERPASS_URL, data=query, timeout=QUERY_TIMEOUT_SECONDS)
            
            if response.status_code in [429, 504]:
                print(f"    Server busy ({response.status_code}). Sleeping for {sleep_time}s...")
                time.sleep(sleep_time)
                sleep_time *= 2
                continue
                
            response.raise_for_status()
            data = response.json()
            
            count = int(data.get('elements', [{}])[0].get('tags', {}).get('nodes', 0))
            
            # Smart Sleep: Only sleep if we found results
            if count > 0:
                print(f"    Found {count} bars. Sleeping for {BASE_SLEEP_SECONDS}s...")
                time.sleep(BASE_SLEEP_SECONDS)
                
            return count # Success!
            
        except requests.exceptions.Timeout:
            print(f"    Query timed out (likely too dense).")
            return None # Signal for recursion (or to process sub-grid)
        except requests.exceptions.RequestException as e:
            print(f"    Network error: {e}. Retrying in {sleep_time}s...")
            time.sleep(sleep_time)
            sleep_time *= 2
        except (KeyError, IndexError, TypeError, json.JSONDecodeError):
            print(f"    Could not parse count from response. Assuming 0.")
            return 0
            
    print(f"    Max retries exceeded. Signaling failure.")
    return None

def get_count_recursive(s, w, n, e, depth=0):
    """
    Recursively fetches bar count, subdividing if the query fails.
    """
    count = fetch_bar_count(s, w, n, e)
    
    if count is not None:
        return count
        
    if depth >= MAX_RECURSION_DEPTH:
        print(f"    Max recursion depth reached for cell {s},{w}. Returning 0.")
        return 0
        
    print(f"  Query failed for cell. Subdividing (Depth {depth+1})...")
    
    mid_lat = (s + n) / 2
    mid_lon = (w + e) / 2
    
    total_count = 0
    total_count += get_count_recursive(s, w, mid_lat, mid_lon, depth + 1)
    total_count += get_count_recursive(s, mid_lon, mid_lat, e, depth + 1)
    total_count += get_count_recursive(mid_lat, w, n, mid_lon, depth + 1)
    total_count += get_count_recursive(mid_lat, mid_lon, n, e, depth + 1)
    
    return total_count

def check_all_fine_cells_done(large_s, large_w, large_n, large_e, grid):
    """Checks if all fine cells in a large cell are already in the grid."""
    fine_lat = large_s
    while fine_lat < large_n:
        fine_lon = large_w
        while fine_lon < large_e:
            cell_key = f"{fine_lat:.1f}_{fine_lon:.1f}"
            if cell_key not in grid:
                return False
            fine_lon += FINAL_LON_STEP
        fine_lat += FINAL_LAT_STEP
    return True

def main():
    print("Starting 2-grid hierarchical generation.")
    print(f"  Large Grid: {LARGE_LAT_STEP} x {LARGE_LON_STEP} degrees")
    print(f"  Final Grid: {FINAL_LAT_STEP} x {FINAL_LON_STEP} degrees")
    
    grid_counts = load_existing_data(OUTPUT_FILE)
    
    # --- Large Grid Loop ---
    large_lat = LAT_MIN
    while large_lat < LAT_MAX:
        large_lon = LON_MIN
        while large_lon < LON_MAX:
            
            # Define large cell bounds
            large_s = large_lat
            large_n = min(large_lat + LARGE_LAT_STEP, LAT_MAX)
            large_w = large_lon
            large_e = min(large_lon + LARGE_LON_STEP, LON_MAX)
            
            print(f"\n--- Processing Large Cell: [{large_s:.1f}, {large_w:.1f}] ---")

            # --- Checkpointing ---
            if check_all_fine_cells_done(large_s, large_w, large_n, large_e, grid_counts):
                print(f"Skipping large cell (all fine cells already processed).")
                large_lon += LARGE_LON_STEP
                continue

            # --- Step 1: Query the *large* cell to check for emptiness ---
            print(f"Querying 10x10 cell to check for emptiness...")
            large_count = fetch_bar_count(large_s, large_w, large_n, large_e)
            
            # --- Step 2: Decide based on large query ---
            
            # Case 1: Large cell is definitively empty.
            if large_count == 0:
                print("Large cell is empty. Filling all 25 sub-grids with 0.")
                
                fine_lat = large_s
                while fine_lat < large_n:
                    fine_lon = large_w
                    while fine_lon < large_e:
                        cell_key = f"{fine_lat:.1f}_{fine_lon:.1f}"
                        if cell_key not in grid_counts: # Checkpoint
                            grid_counts[cell_key] = 0
                        fine_lon += FINAL_LON_STEP
                    fine_lat += FINAL_LAT_STEP
                        
            # Case 2: Large cell has bars (count > 0) OR it timed out (count is None).
            # In either case, we must process the fine grid.
            else:
                if large_count is None:
                    print("Large cell query timed out (too dense). Processing fine grid...")
                else:
                    print(f"Large cell has {large_count} bars. Processing fine grid...")

                fine_lat = large_s
                while fine_lat < large_n:
                    fine_lon = large_w
                    while fine_lon < large_e:
                        
                        # Define fine cell bounds
                        fine_s = fine_lat
                        fine_n = min(fine_lat + FINAL_LAT_STEP, LAT_MAX)
                        fine_w = fine_lon
                        fine_e = min(fine_lon + FINAL_LON_STEP, LON_MAX)
                        cell_key = f"{fine_lat:.1f}_{fine_lon:.1f}"
                        
                        # Checkpoint for this *specific* fine cell
                        if cell_key in grid_counts:
                            print(f"  Skipping fine cell {cell_key} (already processed).")
                            fine_lon += FINAL_LON_STEP
                            continue
                            
                        print(f"  Processing fine cell {cell_key} [{fine_s:.1f}, {fine_w:.1f}]...")
                        
                        # Use recursion for the fine cell
                        count = get_count_recursive(fine_s, fine_w, fine_n, fine_e, depth=0)
                        
                        print(f"    Total for fine cell {cell_key}: {count}")
                        grid_counts[cell_key] = count
                        
                        # Save after each *fine* cell for safety
                        save_data(OUTPUT_FILE, grid_counts) 
                        
                        fine_lon += FINAL_LON_STEP
                    fine_lat += FINAL_LAT_STEP

            # Save after *each* large cell is fully processed
            print(f"Finished large cell. Saving progress.")
            save_data(OUTPUT_FILE, grid_counts)
            
            large_lon += LARGE_LON_STEP
        large_lat += LARGE_LAT_STEP

    print("\nGrid generation complete!")
    print(f"Final data saved to {OUTPUT_FILE}.")

if __name__ == "__main__":
    main()