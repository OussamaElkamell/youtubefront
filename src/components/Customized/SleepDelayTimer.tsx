import { useEffect, useState } from 'react';

const SleepDelayTimer = ({ schedule }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!schedule.sleepDelayMinutes || !schedule.sleepDelayStartTime) {
      setTimeLeft(0);
      return;
    }

    const delayStartTime = new Date(schedule.sleepDelayStartTime);
    const delayEndTime = new Date(delayStartTime.getTime() + schedule.sleepDelayMinutes * 60 * 1000);

    let interval: NodeJS.Timeout;
    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, delayEndTime.getTime() - now.getTime());
      setTimeLeft(remaining);

      if (remaining <= 0 && interval) {
        clearInterval(interval);
      }
    };

    updateTimer(); // Initial update
    interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [schedule.sleepDelayMinutes, schedule.sleepDelayStartTime]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000).toString().padStart(2, '0');

  return (
    <span>
      Current sleep delay: {schedule.sleepDelayMinutes} minutes
      {typeof schedule.sleepDelayMinutes === 'number' && schedule.sleepDelayMinutes > 0 && (
        <> | Real-time remaining: {minutes}:{seconds}</>
      )}
    </span>
  );
};

export default SleepDelayTimer;
