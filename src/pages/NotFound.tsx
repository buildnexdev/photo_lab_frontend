import { ButtonLink } from '../components/ui';

export default function NotFound() {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="font-display text-6xl text-stone-300">404</p>
            <h1 className="text-xl font-semibold">Page not found</h1>
            <p className="max-w-md text-sm text-stone-500">The page you are looking for does not exist or has moved.</p>
            <ButtonLink to="/">Back to home</ButtonLink>
        </div>
    );
}
