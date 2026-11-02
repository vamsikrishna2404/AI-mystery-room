
import { useState, useEffect } from "react";

function CountdownTimer() {
  console.log("Countdown component rendered");
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    console.log("Countdown effect started");
    if (timeLeft === 0) {
      return;
    }

    const timer = setTimeout(() => {
        console.log("Timer is running!");
        setTimeLeft((previousTime) => previousTime - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div>
      <h2>Time Remaining - TEST</h2>

      <h1>
        {String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </h1>

      {timeLeft === 0 && <h2>Time's Up!</h2>}
    </div>
  );
}

export default CountdownTimer;
