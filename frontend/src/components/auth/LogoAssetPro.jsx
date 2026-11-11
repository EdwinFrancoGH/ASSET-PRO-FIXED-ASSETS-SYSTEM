// Isotipo de ASSET PRO: la "A" plateada con órbita roja y barras del logo
// original (public/images/asset-pro-isotipo.png, fondo transparente).
export default function LogoAssetPro({ className = "h-12 w-12" }) {
    return (
        <img
            src="/images/asset-pro-isotipo.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`${className} object-contain select-none`}
        />
    );
}
