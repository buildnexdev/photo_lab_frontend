// Developer by: Buildnexdev.in
// Devevloper : Nandhakumar@gmail.com
// Last Edited : 06-10-2026
import { StaffDirectory } from '../../components/staff/StaffDirectory';
import './Staff.scss';

/** Per-user page access is managed from the Manage column (admins only). */
export default function AdminStaff() {
    return <StaffDirectory title="Staff" subtitle="Everyone who works in the studio and their access." />;
}
