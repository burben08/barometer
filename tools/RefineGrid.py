# %%
import requests
import json
import time
import os

# --- Configuration ---
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# --- File Configuration ---
# MUST match your renamed existing file
OLD_INPUT_FILE = "bar_density_grid.json" 
# The new file that will be created
NEW_OUTPUT_FILE = "bar_density_grid_1x1.json" 

# --- Grid Configuration ---
OLD_STEP = 2.0  # The grid size of your *input* file
NEW_STEP = 1.0  # The new, refined grid size we are creating

# --- API Settings ---
BASE_SLEEP_SECONDS = 2
MAX_RECURSION_DEPTH = 3 # 1.0 -> 0.5 -> 0.25
QUERY_TIMEOUT_SECONDS = 20 
# --- End Configuration ---


# --- Helper Functions (Copied from previous script) ---

def load_existing_data(filename):
    """Loads existing grid data if the file exists."""
    if os.path.exists(filename):
        try:
            with open(filename, 'r') as f:
                content = f.read()
                if not content: return {} # Handle empty file
                return json.loads(content)
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
    """Fetches the *count* of bars/pubs, with smart sleep."""
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
            if count > 0:
                print(f"    Found {count} bars. Sleeping for {BASE_SLEEP_SECONDS}s...")
                time.sleep(BASE_SLEEP_SECONDS)
            return count
        except requests.exceptions.Timeout:
            print(f"    Query timed out (likely too dense).")
            return None
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
    """Recursively fetches bar count, subdividing if the query fails."""
    count = fetch_bar_count(s, w, n, e)
    if count is not None:
        return count
    if depth >= MAX_RECURSION_DEPTH:
        print(f"    Max recursion depth reached. Returning 0.")
        return 0
    print(f"  Query failed for cell. Subdividing (Depth {depth+1})...")
    
    # Note: This recursion is for the *new* 1x1 step
    mid_lat = (s + n) / 2
    mid_lon = (w + e) / 2
    
    total_count = 0
    total_count += get_count_recursive(s, w, mid_lat, mid_lon, depth + 1)
    total_count += get_count_recursive(s, mid_lon, mid_lat, e, depth + 1)
    total_count += get_count_recursive(mid_lat, w, n, mid_lon, depth + 1)
    total_count += get_count_recursive(mid_lat, mid_lon, n, e, depth + 1)
    return total_count

def get_key(s, w):
    """Generates a consistent 1-decimal-place key."""
    return f"{s:.1f}_{w:.1f}"

# --- Main Refinement Logic ---

def main():
    print(f"--- Starting Grid Refinement ---")
    print(f"Reading 2x2 grid from: {OLD_INPUT_FILE}")
    print(f"Writing 1x1 grid to:   {NEW_OUTPUT_FILE}")
    
    # 1. Load both files
    try:
        old_grid = load_existing_data(OLD_INPUT_FILE)
        if not old_grid:
            print(f"Error: Input file '{OLD_INPUT_FILE}' is empty or not found.")
            print("Please make sure you have renamed your 2x2 grid file correctly.")
            return
    except FileNotFoundError:
        print(f"Error: Input file '{OLD_INPUT_FILE}' not found.")
        print("Please make sure you have renamed your 2x2 grid file correctly.")
        return
        
    new_grid = load_existing_data(NEW_OUTPUT_FILE)
    
    print(f"Loaded {len(old_grid)} 2x2 cells to process.")
    print(f"Loaded {len(new_grid)} 1x1 cells already completed (checkpointing).")

    total_old_cells = len(old_grid)
    processed_count = 0

    # 2. Iterate over the OLD 2x2 grid
    for key, old_count in old_grid.items():
        processed_count += 1
        
        try:
            s2, w2 = map(float, key.split('_'))
        except ValueError:
            print(f"Skipping malformed key from old file: {key}")
            continue
            
        n2 = s2 + OLD_STEP
        e2 = w2 + OLD_STEP
        
        # Define the 4 new 1x1 sub-cells
        mid_lat = s2 + NEW_STEP
        mid_lon = w2 + NEW_STEP
        
        # [ (s, w, n, e), (s, w, n, e), ... ]
        sub_cell_bounds = [
            (s2, w2, mid_lat, mid_lon),      # SW
            (s2, mid_lon, mid_lat, e2),      # SE
            (mid_lat, w2, n2, mid_lon),      # NW
            (mid_lat, mid_lon, n2, e2)       # NE
        ]
        
        # Get the keys for the new 1x1 cells
        sub_keys = [get_key(b[0], b[1]) for b in sub_cell_bounds]

        # --- Checkpointing ---
        # If all 4 sub-keys are *already* in our new file, skip this 2x2 cell
        if all(k in new_grid for k in sub_keys):
            # print(f"Skipping {key} (all 1x1 sub-cells already processed).")
            continue

        print(f"\nProcessing 2x2 Cell {processed_count}/{total_old_cells}: {key}")

        # --- Case 1: The 2x2 cell was empty ---
        if old_count == 0:
            print(f"  Cell {key} is empty. Splitting into four 0-count 1x1 cells.")
            for sub_key in sub_keys:
                if sub_key not in new_grid:
                    new_grid[sub_key] = 0
            save_data(NEW_OUTPUT_FILE, new_grid) # Save this block of 4

        # --- Case 2: The 2x2 cell had bars ---
        else:
            print(f"  Cell {key} has {old_count} bars. Refining 1x1 sub-cells...")
            
            for i in range(4):
                bounds = sub_cell_bounds[i]
                sub_key = sub_keys[i]
                
                # Checkpointing for *this specific 1x1 cell*
                if sub_key in new_grid:
                    print(f"    Skipping 1x1 cell {sub_key} (already done).")
                    continue
                    
                s, w, n, e = bounds
                print(f"    Processing 1x1 cell {sub_key}...")
                
                # Use recursion for the 1x1 cell.
                # This will start by querying 1x1, and subdivide if it times out
                new_count = get_count_recursive(s, w, n, e, depth=0)
                
                print(f"      -> Total for 1x1 cell {sub_key}: {new_count}")
                new_grid[sub_key] = new_count
                
                # Save after *each* 1x1 cell for maximum safety
                save_data(NEW_OUTPUT_FILE, new_grid)

    print("\n--- Grid Refinement Complete! ---")
    print(f"New 1x1 grid data is saved in {NEW_OUTPUT_FILE}")

if __name__ == "__main__":
    main()