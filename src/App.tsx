import { useEffect, useState } from 'react';
import { phaseForWeek } from './domain/plan';
import { buildAerobicSession, finish, startSession, type SessionState } from './domain/session';
import { loadData, saveData, type StoredData } from './domain/storage';
import { HomeScreen } from './features/home/HomeScreen';
import { SessionScreen } from './features/session/SessionScreen';
import { SummaryScreen } from './features/session/SummaryScreen';
import { speak, voiceSupported } from './lib/voice';

type Screen = { name: 'home' } | { name: 'session'; session: SessionState } | { name: 'summary'; session: SessionState };

export function App() {
  const [data, setData] = useState<StoredData>(() => loadData());
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [minutes, setMinutes] = useState(() => phaseForWeek(loadData().week).proposedMinutes);
  const [speed, setSpeed] = useState(1);
  const [voiceOn, setVoiceOn] = useState(voiceSupported());

  useEffect(() => saveData(data), [data]);

  const setWeek = (week: number) => {
    setData((d) => ({ ...d, week }));
    setMinutes(phaseForWeek(week).proposedMinutes);
  };

  const start = () => {
    // El primer mensaje de voz tiene que salir de un toque del usuario (requisito de iOS).
    if (voiceOn) speak(' ');
    const plan = buildAerobicSession(data.week, minutes);
    setScreen({ name: 'session', session: startSession(plan, Date.now(), data.personalOffset, speed) });
  };

  if (screen.name === 'session') {
    return (
      <SessionScreen
        session={screen.session}
        onChange={(session) => setScreen({ name: 'session', session })}
        onFinish={(session) => setScreen({ name: 'summary', session: finish(session, Date.now()) })}
        onPersonalOffset={(personalOffset) => setData((d) => ({ ...d, personalOffset }))}
        voiceOn={voiceOn}
        onToggleVoice={() => setVoiceOn((v) => !v)}
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

  return (
    <HomeScreen
      week={data.week}
      onWeek={setWeek}
      minutes={minutes}
      onMinutes={setMinutes}
      speed={speed}
      onSpeed={setSpeed}
      personalOffset={data.personalOffset}
      onResetOffset={() => setData((d) => ({ ...d, personalOffset: 0 }))}
      history={data.history}
      onStart={start}
    />
  );
}
