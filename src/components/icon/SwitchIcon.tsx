interface SwitchIconProps {
    isOn: boolean;
    disabled?: boolean;
    className?: string;
}

export default function SwitchIcon({ isOn, disabled = false, className = "" }: SwitchIconProps) {
    return (
        <div className={`inline-flex justify-start items-center gap-2 ${className}`}>
            <div className={`w-11 h-6 rounded-[50px] relative transition-colors duration-200 ${
                disabled 
                    ? 'bg-slate-100' 
                    : isOn 
                        ? 'bg-slate-900' 
                        : 'bg-slate-200'
            }`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ${
                    isOn ? 'translate-x-5' : 'translate-x-0.5'
                } ${disabled ? 'opacity-50' : ''}`} />
            </div>
        </div>
    );
}