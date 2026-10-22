import { RouterProvider } from 'react-router';
import { router } from '../routes/contentRoutes';

export default function App() {
    return <RouterProvider router={router} />;
}
