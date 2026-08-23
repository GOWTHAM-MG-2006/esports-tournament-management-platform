/** Small centered Bootstrap spinner with an accessible label. */
export default function LoadingSpinner({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="text-center py-4">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">{text}</span>
      </div>
      <p className="text-muted mt-2 mb-0">{text}</p>
    </div>
  );
}
