import { useEffect, useState } from 'react';
import { phaseForWeek } from './domain/plan';
import { currentWeek, type Profile } from './domain/profile';
import { buildAerobicSession, finish, startSession, type SessionState } from './domain/session';
import { loadData, saveData, type StoredData } from './domain/storage';
import { HomeScreen } from './features/home/HomeScreen';
import { Onboarding } from './features/onboarding/Onboarding';
import { SessionScreen } from './features/session/SessionScreen';
import { SummaryScreen } from './features/session/SummaryScreen';
import { soundSupported, unlockSound } from './lib/sound';

type Screen = { name: 'home' } | { name: 'session'; session: SessionState } | { name: 'summary'; session: SessionState };

function weekOf(data: StoredData): number {
  if (data.weekOverride !== null) return data.weekOverride;
  return data.profile ? currentWeek(data.profile.startDate, new Date()) : 1;
}

/** Minutos de la sesión de hoy: la propuesta de la fase o lo que eligió el usuario. */
function plannedMinutes(profile: Profile | undefined, week: number): number {
  if (!profile || profile.planMode === 'recommended') return phaseForWeek(week).proposedMinutes;
  return profile.minutes;
}

export function App() {
  const [data, setData] = useState<StoredData>(() => loadData());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const week = weekOf(data);
  const [minutes, setMinutes] = useState(() => plannedMinutes(data.profile, week));
  const [speed, setSpeed] = useState(1);
  const [soundOn, setSoundOn] = useState(soundSupported());

  useEffect(() => saveData(data), [data]);

  const completeOnboarding = (profile: Profile) => {
    setData((d) => ({ ...d, profile, weekOverride: null }));
    setMinutes(plannedMinutes(profile, 1));
  };

  const setWeekOverride = (weekOverride: number | null) => {
    const next = { ...data, weekOverride };
    setData(next);
    setMinutes(plannedMinutes(next.profile, weekOf(next)));
  };

  const start = () => {
    // El audio solo se puede activar dentro de un toque del usuario (requisito de iOS).
    unlockSound();
    const plan = buildAerobicSession(week, minutes);
    setScreen({ name: 'session', session: startSession(plan, Date.now(), data.personalOffset, speed) });
  };

  if (!data.profile) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  if (screen.name === 'session') {
    return (
      <SessionScreen
        session={screen.session}
        onChange={(session) => setScreen({ name: 'session', session })}
        onFinish={(session) => setScreen({ name: 'summary', session: finish(session, Date.now()) })}
        onPersonalOffset={(personalOffset) => setData((d) => ({ ...d, personalOffset }))}
        soundOn={soundOn}
        onToggleSound={() => setSoundOn((v) => !v)}
      />
    );
  }

  if (screen.name === 'summary') {
    return (
      <SummaryScreen
        session={screen.session}
        onSave={(record) => setData((d) => ({ ...d, history: [record, ...d.history] }))}
        onDone={() => setScreen({ name: 'home' })}
      />
    );
  }

  const profile = data.profile;
  return (
    <HomeScreen
      profile={profile}
      week={week}
      weekOverride={data.weekOverride}
      onWeekOverride={setWeekOverride}
      minutes={minutes}
      onMinutes={setMinutes}
      speed={speed}
      onSpeed={setSpeed}
      personalOffset={data.personalOffset}
      onResetOffset={() => setData((d) => ({ ...d, personalOffset: 0 }))}
      history={data.history}
      onStart={start}
      onClearance={() => setData((d) => (d.profile ? { ...d, profile: { ...d.profile, medicalClearance: true } } : d))}
      onRestartOnboarding={() => setData((d) => ({ ...d, profile: undefined, history: [], personalOffset: 0, weekOverride: null }))}
    />
  );
}
