import { Spinner } from './Loader.jsx';

const variants = {
  primary: 'btn-primary',
  soft: 'btn-soft',
  outline: 'btn-outline',
  danger: 'btn-danger',
};

const sizes = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

export default function Button({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, type = 'button', ...props }) {
  return (
    <button type={type} className={`btn ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
