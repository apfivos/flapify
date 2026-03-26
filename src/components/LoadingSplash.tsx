export function LoadingSplash({ visible }: { visible: boolean }) {
  return (
    <div className={`ff-splash ${visible ? "is-visible" : "is-hidden"}`} aria-hidden={!visible}>
      <div className="ff-splash__wordmark">FLAPIFY</div>
    </div>
  );
}
