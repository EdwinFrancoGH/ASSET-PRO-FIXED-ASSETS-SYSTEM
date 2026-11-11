const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 700_000;

// Comprime la foto antes de guardarla en el documento Firestore del usuario.
// El JPEG pequeño evita depender de Firebase Storage y respeta el límite de
// tamaño del documento de Firestore.
export function resizeImageToBase64(file, { maxSize = 320, quality = 0.82 } = {}) {
    return new Promise((resolve, reject) => {
        if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            reject(new Error("Selecciona una imagen JPG, PNG o WEBP."));
            return;
        }
        if (file.size > MAX_FILE_BYTES) {
            reject(new Error("La imagen original no puede superar 8 MB."));
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
            image.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                const width = Math.max(1, Math.round(image.width * scale));
                const height = Math.max(1, Math.round(image.height * scale));
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("El navegador no pudo preparar la imagen."));
                    return;
                }
                context.drawImage(image, 0, 0, width, height);
                const photoURL = canvas.toDataURL("image/jpeg", quality);
                if (photoURL.length > MAX_DATA_URL_LENGTH) {
                    reject(new Error("La imagen comprimida sigue siendo demasiado grande. Elige otra foto."));
                    return;
                }
                resolve(photoURL);
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}
