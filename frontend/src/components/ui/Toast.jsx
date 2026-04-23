function Toast({ message, type = 'info' }) {
  return (
    <div className={`toast toast-${type}`}>
      <span>{type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <span>{message}</span>
    </div>
  );
}

export default Toast;
