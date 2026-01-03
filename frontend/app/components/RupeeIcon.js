'use client';

// Custom Rupee Icon component to match react-icons style
export default function RupeeIcon({ size = 16, style = {}, className = '' }) {
    return (
        <span
            className={className}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: size,
                height: size,
                fontSize: size * 0.85,
                fontWeight: 600,
                lineHeight: 1,
                ...style
            }}
        >
            ₹
        </span>
    );
}
