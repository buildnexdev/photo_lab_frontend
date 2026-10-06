// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { api } from './api';

/** Ask the server for a short-lived signed URL to the HD original (only granted for purchased photos) and start the download. */
export async function downloadPhoto(photoId: number): Promise<void> {
    const r = await api.post<{ url: string; expiresIn: number; fileName: string }>(`/api/downloads/${photoId}`);
    const a = document.createElement('a');
    a.href = r.url;
    a.download = r.fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
}
