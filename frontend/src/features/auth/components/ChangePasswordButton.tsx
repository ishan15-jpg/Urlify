import { Link } from 'react-router-dom';

interface Props {
  disabled?: boolean;
}

export default function ChangePasswordButton({ disabled }: Props) {
  return (
    <Link
      to={"/change-password"}
      className={`flex items-center justify-center gap-2 border border-outline-variant text-on-surface-variant font-bold max-[500px]:flex-1 max-[500px]:px-4 max-[500px]:py-3 max-[500px]:text-xs px-8 py-4 rounded-lg hover:border-primary hover:text-primary hover:bg-surface-container-high transition-all active:scale-95 ${
        disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    >
      <span className="material-symbols-outlined text-[20px] max-[500px]:text-[16px]">lock</span>
      Change Password
    </Link>
  );
}
