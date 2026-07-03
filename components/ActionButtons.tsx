export default function ActionButtons({
  onRandomize,
  onReset,
}: {
  onRandomize: () => void;
  onReset: () => void;
}) {
  return (
    <div className="btn-row">
      <button type="button" className="btn btn-primary" onClick={onRandomize}>
        สุ่มลาย
      </button>
      <button type="button" className="btn" onClick={onReset}>
        รีเซ็ต
      </button>
    </div>
  );
}
