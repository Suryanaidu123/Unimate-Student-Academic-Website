export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  };
  return (
    <button
      className={`${variants[variant]} ${className} min-h-[40px] sm:min-h-0 touch-manipulation`}
      {...props}
    >
      {children}
    </button>
  );
}