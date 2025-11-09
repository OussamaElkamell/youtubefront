import { useEffect, useState } from 'react';

const SleepDelayTimer = ({ schedule }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const delayMinutes = schedule.delays?.delayofsleep;

    if (typeof delayMinutes !== 'number') return;

    let totalMs = delayMinutes * 60 * 1000;
    setTimeLeft(totalMs);

    const interval = setInterval(() => {
      totalMs -= 1000;
      if (totalMs <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(totalMs);
      }
    }, 1000);

    return () => clearInterval(interval); // Reset on change
  }, [schedule.delays?.delayofsleep]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');

  return (
    <span>
      Current sleep delay: {schedule.delays?.delayofsleep} minutes
      {typeof schedule.delays?.delayofsleep === 'number' && (
        <> | Real-time remaining: {minutes}:{seconds}</>
      )}
    </span>
  );
};

export default SleepDelayTimer;
