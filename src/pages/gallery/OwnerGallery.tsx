// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { EmptyState } from '../../components/data';
import { GalleryViewer } from './GalleryViewer';

/** Signed-in customer viewing a gallery from one of their own events (no QR session needed). */
export default function OwnerGallery() {
    const id = Number(useParams().id);
    if (!Number.isInteger(id) || id <= 0) return <EmptyState title="Gallery not found" />;
    return (
        <div>
            <Link to="/customer/galleries" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800">
                <ArrowLeft className="size-4" /> All galleries
            </Link>
            <GalleryViewer galleryId={id} />
        </div>
    );
}
