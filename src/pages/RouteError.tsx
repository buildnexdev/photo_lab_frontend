// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function RouteError() {
    const error = useRouteError();
    const chunkFailed = error instanceof Error && /dynamically imported module|Importing a module script failed/i.test(error.message);
    const title = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : chunkFailed ? 'A new version is available' : 'Something went wrong';
    const detail = chunkFailed ? 'The app was updated while this page was open. Reload to continue.' : 'An unexpected error occurred while showing this page.';
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="max-w-md text-sm text-stone-500">{detail}</p>
            <div className="flex gap-3">
                <button type="button" className="link" onClick={() => window.location.reload()}>
                    Reload
                </button>
                <Link to="/" className="link">
                    Home
                </Link>
            </div>
        </div>
    );
}
