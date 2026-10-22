// Developer by: Buildnexdev.in
// Developer   : Nandhakumar@gmail.com
// Last Edited : 14-10-2026
import { useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import {
    Camera,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    FolderOpen,
    HardDrive,
    MonitorSmartphone,
    Radio,
    Usb,
    Wifi,
    Zap,
} from 'lucide-react';
import { Alert, Card, PageHeader } from '../../components/ui';
import './CameraSetup.scss';

/* ── tiny accordion ─────────────────────────────────────────────────────── */

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <li className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {n}
            </span>
            <div className="min-w-0">
                <p className="font-medium">{title}</p>
                <div className="mt-1 text-sm text-stone-600 leading-relaxed">{children}</div>
            </div>
        </li>
    );
}

function Accordion({
    icon,
    title,
    subtitle,
    tag,
    defaultOpen,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    tag?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <Card className="overflow-hidden">
            <button
                type="button"
                className="flex w-full items-center gap-4 text-left"
                onClick={() => setOpen((o) => !o)}
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    {icon}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold">{title}</p>
                        {tag && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                                {tag}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-stone-500">{subtitle}</p>
                </div>
                <span className="shrink-0 text-stone-400">
                    {open ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                </span>
            </button>
            {open && <div className="mt-4 border-t border-stone-100 pt-4">{children}</div>}
        </Card>
    );
}

/* ── page ────────────────────────────────────────────────────────────────── */

export default function CameraSetup() {
    return (
        <div>
            <PageHeader
                title="Camera setup guide"
                subtitle="Connect your camera to auto-upload live photos during events. Guests see every shot in real time on their phones."
                actions={
                    <Link
                        to="/photographer/upload"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
                    >
                        <FolderOpen className="size-4" />
                        Go to Upload
                    </Link>
                }
            />

            <Alert className="mb-6" tone="info" title="How it works">
                Your camera saves photos to a folder on your laptop (via Wi-Fi, USB, or SD card). Our app watches that
                folder and automatically uploads every new photo to the event gallery. Guests scanning the QR code see
                photos appear live on their phones.
            </Alert>

            {/* ── overview diagram ──────────────────────────────────────── */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-center justify-center gap-3 py-4 text-sm">
                    <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-4 py-3 font-medium">
                        <Camera className="size-5 text-brand-700" />
                        Camera
                    </div>
                    <ChevronRight className="size-4 text-stone-400 max-sm:hidden" />
                    <span className="text-xs text-stone-400 max-sm:hidden">Wi-Fi / USB</span>
                    <ChevronRight className="size-4 text-stone-400 max-sm:hidden" />
                    <div className="flex items-center gap-2 rounded-lg bg-stone-100 px-4 py-3 font-medium">
                        <FolderOpen className="size-5 text-brand-700" />
                        Laptop folder
                    </div>
                    <ChevronRight className="size-4 text-stone-400 max-sm:hidden" />
                    <span className="text-xs text-stone-400 max-sm:hidden">Auto-detected</span>
                    <ChevronRight className="size-4 text-stone-400 max-sm:hidden" />
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 font-medium text-emerald-800">
                        <Radio className="size-5" />
                        Live gallery
                    </div>
                    <ChevronRight className="size-4 text-stone-400 max-sm:hidden" />
                    <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-4 py-3 font-medium text-brand-800">
                        <MonitorSmartphone className="size-5" />
                        Guest phone
                    </div>
                </div>
            </Card>

            {/* ── Method 1: Wi-Fi FTP ──────────────────────────────────── */}
            <div className="space-y-4">
                <Accordion
                    icon={<Wifi className="size-5" />}
                    title="Method 1 — Camera Wi-Fi (FTP transfer)"
                    subtitle="Wireless. Camera auto-sends each shot over Wi-Fi. Best for stationary setups."
                    tag="Recommended"
                    defaultOpen
                >
                    <div className="space-y-6">
                        {/* Canon */}
                        <div>
                            <h4 className="mb-3 font-semibold text-stone-900">Canon (EOS R5, R6, R3, 5D IV, 90D)</h4>
                            <ol className="space-y-3">
                                <Step n={1} title="Enable Wi-Fi on the camera">
                                    Go to <strong>Menu → Network → Wi-Fi settings → Enable</strong>. Connect the camera to your laptop's Wi-Fi hotspot or the venue's Wi-Fi.
                                </Step>
                                <Step n={2} title="Set FTP transfer mode">
                                    Go to <strong>Menu → Network → Connection settings → FTP transfer</strong>. Enter your laptop's IP address and choose a target folder like <code>C:\Shoots\Live</code>.
                                </Step>
                                <Step n={3} title="Enable auto-transfer">
                                    Go to <strong>Menu → Network → FTP transfer → Auto transfer → Enable</strong>. Every shot is now automatically sent to your laptop.
                                </Step>
                                <Step n={4} title="Connect in our app">
                                    Open the <Link to="/photographer/upload" className="text-brand-700 underline">Upload page</Link>, select your event, click <strong>"Connect camera folder"</strong>, and pick the FTP output folder.
                                </Step>
                            </ol>
                            <p className="mt-3 text-xs text-stone-400">
                                Detailed guide:{' '}
                                <a href="https://www.usa.canon.com/support/p/eos-r5" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                                    Canon EOS R5 Manual — FTP Transfer <ExternalLink className="mb-0.5 inline size-3" />
                                </a>
                            </p>
                        </div>

                        <hr className="border-stone-100" />

                        {/* Nikon */}
                        <div>
                            <h4 className="mb-3 font-semibold text-stone-900">Nikon (Z6 III, Z8, Z9, D850)</h4>
                            <ol className="space-y-3">
                                <Step n={1} title="Open the network menu">
                                    Go to <strong>Menu → Setup → Connect to other devices → Wi-Fi connection</strong>. Connect to the same network as your laptop.
                                </Step>
                                <Step n={2} title="Configure FTP upload">
                                    Select <strong>Upload to FTP server</strong> → create a new profile → enter your laptop's IP and the folder path.
                                </Step>
                                <Step n={3} title="Enable auto-send">
                                    In the FTP profile, turn on <strong>Auto send</strong>. Every new photo is transmitted immediately.
                                </Step>
                                <Step n={4} title="Connect in our app">
                                    Open the <Link to="/photographer/upload" className="text-brand-700 underline">Upload page</Link>, click <strong>"Connect camera folder"</strong>, and pick the folder.
                                </Step>
                            </ol>
                        </div>

                        <hr className="border-stone-100" />

                        {/* Sony */}
                        <div>
                            <h4 className="mb-3 font-semibold text-stone-900">Sony (A7 IV, A7R V, A1, A9 III)</h4>
                            <ol className="space-y-3">
                                <Step n={1} title="Enable Wi-Fi">
                                    Go to <strong>Menu → Network → Wi-Fi Settings → Wi-Fi Connect</strong>. Connect to your laptop's network.
                                </Step>
                                <Step n={2} title="Set up FTP transfer">
                                    Go to <strong>Menu → Network → FTP Transfer Func. → FTP Server Setting</strong>. Enter the laptop IP and destination directory.
                                </Step>
                                <Step n={3} title="Turn on auto-transfer">
                                    Set <strong>FTP Transfer Func. → Auto Transfer → On</strong>. Photos are pushed as soon as they are captured.
                                </Step>
                                <Step n={4} title="Connect in our app">
                                    Open the <Link to="/photographer/upload" className="text-brand-700 underline">Upload page</Link>, click <strong>"Connect camera folder"</strong>, and pick the folder.
                                </Step>
                            </ol>
                        </div>
                    </div>
                </Accordion>

                {/* ── Method 2: USB Tethering ──────────────────────────── */}
                <Accordion
                    icon={<Usb className="size-5" />}
                    title="Method 2 — USB Tethering"
                    subtitle="Wired. Most reliable. Camera plugs into laptop via USB cable."
                >
                    <div className="space-y-3">
                        <ol className="space-y-3">
                            <Step n={1} title="Connect your camera via USB">
                                Use the USB cable that came with your camera. Plug it into your laptop.
                            </Step>
                            <Step n={2} title="Open your tethering software">
                                Use <strong>Canon EOS Utility</strong>, <strong>Nikon NX Tether</strong>, <strong>Sony Imaging Edge Desktop</strong>, or <strong>Capture One</strong>. Set the save folder to something like <code>C:\Shoots\Live</code>.
                            </Step>
                            <Step n={3} title="Start shooting">
                                Every photo you take is saved directly to the laptop folder in real time.
                            </Step>
                            <Step n={4} title="Connect in our app">
                                Open the <Link to="/photographer/upload" className="text-brand-700 underline">Upload page</Link>, click <strong>"Connect camera folder"</strong>, and pick the tether output folder.
                            </Step>
                        </ol>
                        <Alert tone="success" title="Pro tip">
                            USB tethering is the most reliable method. No Wi-Fi drops, no packet loss. Use a long USB cable (5 m) or a USB extender for freedom of movement.
                        </Alert>
                    </div>
                </Accordion>

                {/* ── Method 3: SD Card Reader ─────────────────────────── */}
                <Accordion
                    icon={<HardDrive className="size-5" />}
                    title="Method 3 — SD Card hot-swap"
                    subtitle="Offline-first. Shoot on one card, import from another. Good for large events with an assistant."
                >
                    <ol className="space-y-3">
                        <Step n={1} title="Use two SD cards">
                            Shoot on Card A. When it fills up (or periodically), swap it out and give it to your assistant.
                        </Step>
                        <Step n={2} title="Assistant inserts card into laptop">
                            The SD card appears as a folder (e.g. <code>D:\DCIM\100CANON</code>).
                        </Step>
                        <Step n={3} title="Connect in our app">
                            The assistant opens the <Link to="/photographer/upload" className="text-brand-700 underline">Upload page</Link>, clicks <strong>"Connect camera folder"</strong>, and selects the DCIM folder. All photos upload automatically.
                        </Step>
                        <Step n={4} title="Swap and repeat">
                            Return Card A, take Card B, and repeat. Our watcher ignores already-uploaded files.
                        </Step>
                    </ol>
                </Accordion>

                {/* ── Method 4: Laptop FTP Server ──────────────────────── */}
                <Accordion
                    icon={<Zap className="size-5" />}
                    title="Quick-start — Set up a laptop FTP server (Windows)"
                    subtitle="One-time setup to make your laptop accept photos from any Wi-Fi camera."
                >
                    <div className="space-y-3">
                        <ol className="space-y-3">
                            <Step n={1} title="Install a lightweight FTP server">
                                Download <a href="https://filezilla-project.org/download.php?type=server" target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">FileZilla Server (free) <ExternalLink className="mb-0.5 inline size-3" /></a> or use the built-in Windows IIS FTP.
                            </Step>
                            <Step n={2} title="Create a user and folder">
                                Create a user (e.g. <code>camera</code>) with a password. Set the home directory to <code>C:\Shoots\Live</code>.
                            </Step>
                            <Step n={3} title="Note your laptop's IP address">
                                Open a terminal and run <code>ipconfig</code>. Note the IPv4 address on the Wi-Fi adapter (e.g. <code>192.168.1.42</code>).
                            </Step>
                            <Step n={4} title="Configure camera FTP settings">
                                In your camera's FTP settings, enter: <br />
                                <code className="mt-1 inline-block rounded bg-stone-100 px-2 py-1 text-xs">
                                    Server: 192.168.1.42 &nbsp;|&nbsp; Port: 21 &nbsp;|&nbsp; User: camera &nbsp;|&nbsp; Folder: /
                                </code>
                            </Step>
                            <Step n={5} title="Test and shoot">
                                Take a test photo. Confirm it appears in <code>C:\Shoots\Live</code>. Then connect that folder in our app.
                            </Step>
                        </ol>
                        <Alert tone="warning" title="Firewall">
                            Make sure Windows Firewall allows FTP connections on port 21. If at a venue, you may need to create your own Wi-Fi hotspot from the laptop.
                        </Alert>
                    </div>
                </Accordion>
            </div>

            {/* ── Troubleshooting ──────────────────────────────────────── */}
            <Card className="mt-6" title="Troubleshooting">
                <div className="space-y-3 text-sm">
                    <div>
                        <p className="font-medium">Photos are not appearing in the folder</p>
                        <p className="text-stone-500">Check that the camera and laptop are on the same Wi-Fi network. Try pinging the laptop IP from a terminal. Restart the FTP server.</p>
                    </div>
                    <hr className="border-stone-100" />
                    <div>
                        <p className="font-medium">"Connect camera folder" button is disabled</p>
                        <p className="text-stone-500">You must select an event first. The event must be in "Live" or "Uploading" status.</p>
                    </div>
                    <hr className="border-stone-100" />
                    <div>
                        <p className="font-medium">Browser says "Your browser does not support this feature"</p>
                        <p className="text-stone-500">The folder watcher requires <strong>Chrome</strong> or <strong>Edge</strong> (version 86+). Firefox and Safari do not support the File System Access API. Use the manual drag-and-drop uploader as a fallback.</p>
                    </div>
                    <hr className="border-stone-100" />
                    <div>
                        <p className="font-medium">Duplicate uploads</p>
                        <p className="text-stone-500">Our system uses SHA-256 fingerprinting. Even if you reconnect the same folder, already-uploaded photos are detected and skipped automatically.</p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
