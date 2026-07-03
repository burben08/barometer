import React, { useState } from 'react';
import { Search, Bell, Map as MapIcon, Home, User, Bookmark, MapPin, Flame, Trophy, Camera } from 'lucide-react';
import {
  Button,
  IconButton,
  Fab,
  Card,
  StatTile,
  Input,
  Badge,
  Avatar,
  ProgressBar,
  BottomNav,
  BottomSheet,
  Modal,
  ToastProvider,
  useToast,
  MapView,
  MapPoint,
} from '../components';
import { useHaptic } from '../hooks/useHaptic';

/**
 * Reference implementation showing how the design system's primitives
 * compose into real screens for a geolocation logging game. Copy patterns
 * from here — don't copy this file verbatim into a real app.
 */

// ---- Mock domain data --------------------------------------------------

interface Quest {
  id: number;
  title: string;
  place: string;
  lat: number;
  lng: number;
  xp: number;
  color: string;
  category: string;
}

const QUESTS: Quest[] = [
  { id: 1, title: 'Sunrise at the overlook', place: 'Kreuzberg', lat: 52.4996, lng: 13.4033, xp: 80, color: '#FF6B6B', category: 'Scenic' },
  { id: 2, title: 'Try the corner café', place: 'Neukölln', lat: 52.482, lng: 13.435, xp: 40, color: '#7C6CFF', category: 'Food' },
  { id: 3, title: 'Ride the whole canal path', place: 'Landwehrkanal', lat: 52.4935, lng: 13.42, xp: 120, color: '#58B06A', category: 'Fitness' },
];

// ---- A domain composite built from primitives --------------------------

const QuestCard = ({ quest, onClick }: { quest: Quest; onClick?: () => void }) => (
  <Card onClick={onClick} className="flex justify-between items-center">
    <div className="flex gap-3 items-center min-w-0">
      <div
        className="w-12 h-12 rounded-full border-regular border-border flex items-center justify-center shrink-0"
        style={{ backgroundColor: quest.color }}
      >
        <MapPin size={20} className="text-white" strokeWidth={2.5} />
      </div>
      <div className="min-w-0">
        <h4 className="font-bold font-body leading-tight truncate">{quest.title}</h4>
        <p className="text-ink-muted text-sm font-medium truncate">{quest.place}</p>
      </div>
    </div>
    <Badge variant="warning" className="shrink-0">+{quest.xp} XP</Badge>
  </Card>
);

// ---- Screens -------------------------------------------------------------

const HomeView = ({ onUnlockDemo }: { onUnlockDemo: () => void }) => {
  const haptic = useHaptic();
  const toast = useToast();

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="flex justify-between items-center mt-2">
        <div>
          <p className="text-ink-muted text-sm font-medium">Welcome back</p>
          <h1 className="text-4xl font-black font-display tracking-tight">Jules 🙂</h1>
        </div>
        <div className="flex gap-3">
          <IconButton icon={<Bell size={20} />} aria-label="Notifications" />
          <Avatar initial="J" bgColor="bg-primary" />
        </div>
      </div>

      <Input icon={<Search size={18} />} placeholder="Search a quest or place" />

      <div className="grid grid-cols-2 gap-4">
        <StatTile
          value="12"
          label="Day streak 🔥"
          bgColor="bg-tertiary-pastel"
          decoration={
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white rounded-full border-regular border-border flex items-center justify-center">
              <Flame size={28} />
            </div>
          }
        />
        <StatTile
          value="2,340"
          label="Total XP"
          bgColor="bg-primary-pastel"
          decoration={
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white rounded-full border-regular border-border flex items-center justify-center">
              <Trophy size={28} />
            </div>
          }
        />
      </div>

      <Card>
        <ProgressBar value={2340} max={3000} label="Level 7" trailingLabel="660 XP to Level 8" fillColor="bg-secondary" />
      </Card>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black font-display">Nearby Quests</h3>
          <button
            className="text-sm font-bold"
            onClick={() => {
              haptic.success();
              onUnlockDemo();
            }}
          >
            Preview unlock →
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {QUESTS.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              onClick={() => {
                haptic.light();
                toast(`Saved "${q.title}" for later`, 'success');
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const MapScreen = () => {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<Quest | null>(null);
  const haptic = useHaptic();
  const toast = useToast();

  const points: MapPoint[] = QUESTS.map((q) => ({ id: q.id, lat: q.lat, lng: q.lng, color: q.color }));

  const handlePointClick = (point: MapPoint) => {
    const quest = QUESTS.find((q) => q.id === point.id) ?? null;
    setSelected(quest);
    setExpanded(true);
    haptic.light();
  };

  return (
    <div className="relative h-[calc(100vh-2rem)] w-full -mx-4 px-4 flex flex-col">
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
        <h2 className="text-2xl font-black font-display bg-surface/90 px-4 py-2 border-regular border-border rounded-control shadow-brutal-sm pointer-events-auto backdrop-blur-sm">
          Explore
        </h2>
        <IconButton icon={<Search size={18} />} aria-label="Search map" className="pointer-events-auto" />
      </div>

      <div className="flex-1 rounded-sheet overflow-hidden mb-24 relative">
        <MapView
          points={points}
          onPointClick={handlePointClick}
          currentLocation={{ lat: 52.4996, lng: 13.4033 }}
          center={[52.495, 13.42]}
        />
      </div>

      <BottomSheet expanded={expanded} onToggle={() => setExpanded((v) => !v)} title={selected ? selected.title : 'Nearby Opportunities'}>
        {selected ? (
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-ink-muted font-medium mb-4">{selected.place}</p>
              <div className="flex gap-2 mb-4">
                <Badge variant="secondary">{selected.category}</Badge>
                <Badge variant="warning">+{selected.xp} XP</Badge>
              </div>
              <p className="text-sm text-ink-muted">
                Log this activity in person to claim the reward. Your GPS check-in is verified automatically within 100m.
              </p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t-thin border-dashed border-border/30">
              <div className="font-black font-display text-2xl">+{selected.xp} XP</div>
              <Button
                onClick={() => {
                  haptic.success();
                  toast('Quest logged! XP added.', 'success');
                }}
              >
                Check in
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {QUESTS.map((q) => (
              <div
                key={q.id}
                onClick={() => setSelected(q)}
                className="p-3 border-thin border-border rounded-control hover:bg-bg cursor-pointer flex justify-between items-center"
              >
                <div className="min-w-0">
                  <h4 className="font-bold truncate">{q.title}</h4>
                  <p className="text-xs text-ink-muted truncate">{q.place}</p>
                </div>
                <Badge variant="warning" className="shrink-0">+{q.xp} XP</Badge>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

const ComingSoon = ({ label }: { label: string }) => (
  <div className="flex-1 flex items-center justify-center pb-24 min-h-[60vh]">
    <Card className="text-center p-8">
      <h2 className="text-2xl font-black font-display mb-2">{label}</h2>
      <p className="text-ink-muted font-medium">This view is under construction.</p>
    </Card>
  </div>
);

// ---- Root shell ------------------------------------------------------------

const AppShell = () => {
  const [view, setView] = useState('home');
  const [unlockOpen, setUnlockOpen] = useState(false);
  const haptic = useHaptic();
  const toast = useToast();

  const renderView = () => {
    switch (view) {
      case 'home':
        return <HomeView onUnlockDemo={() => setUnlockOpen(true)} />;
      case 'map':
        return <MapScreen />;
      case 'saved':
        return <ComingSoon label="Saved Quests" />;
      case 'profile':
        return <ComingSoon label="Profile" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg font-body text-ink selection:bg-secondary-pastel">
      <div className="max-w-md mx-auto min-h-screen bg-bg p-4 pt-8 relative overflow-x-hidden">
        <main className="h-full flex flex-col">{renderView()}</main>

        {view !== 'map' && (
          <Fab
            icon={<Camera size={20} />}
            label="Log"
            aria-label="Log an activity"
            onClick={() => {
              haptic.medium();
              toast('Opening camera check-in…', 'info');
            }}
          />
        )}

        <BottomNav
          current={view}
          onChange={setView}
          items={[
            { key: 'home', icon: <Home />, label: 'Home' },
            { key: 'map', icon: <MapIcon />, label: 'Map' },
            { key: 'saved', icon: <Bookmark />, label: 'Saved' },
            { key: 'profile', icon: <User />, label: 'Profile' },
          ]}
        />

        <Modal open={unlockOpen} onClose={() => setUnlockOpen(false)} title="Achievement unlocked!">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="w-20 h-20 rounded-full bg-warning border-thick border-border shadow-brutal-md flex items-center justify-center animate-pop-in">
              <Trophy size={36} />
            </div>
            <p className="font-bold text-lg">Early Bird</p>
            <p className="text-ink-muted text-sm">Logged 3 quests before 8am. +150 bonus XP.</p>
            <Button className="mt-2" fullWidth onClick={() => setUnlockOpen(false)}>
              Nice!
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
};

const App = () => (
  <ToastProvider>
    <AppShell />
  </ToastProvider>
);

export default App;
