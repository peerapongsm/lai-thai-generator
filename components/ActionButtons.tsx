"use client";

import { useState } from "react";

export default function ActionButtons({
  onRandomize,
  onReset,
}: {
  onRandomize: () => void;
  onReset: () => void;
}) {
  const [shimmering, setShimmering] = useState(false);

  const handleRandomize = () => {
    onRandomize();
    setShimmering(true);
  };

  return (
    <div className="btn-row">
      <button
        type="button"
        className={`btn btn-primary${shimmering ? " is-shimmering" : ""}`}
        onClick={handleRandomize}
        onAnimationEnd={() => setShimmering(false)}
      >
        สุ่มลาย
      </button>
      <button type="button" className="btn" onClick={onReset}>
        รีเซ็ต
      </button>
    </div>
  );
}
