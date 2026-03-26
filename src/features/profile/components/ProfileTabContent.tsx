"use client";

import {
  UserCircle,
  Palette,
  Shield,
  Settings,
  Info,
  Mail,
  Github,
  ExternalLink,
  ShieldCheck,
  Database,
  Eye,
  Link2,
  FileText,
  Wallet,
} from "lucide-react";
import type { ThemeClasses } from "@/shared/lib/theme";
import type { TabId } from "./ProfileTabs";
import { appInfo } from "@/shared/lib/config/appInfo";

interface ProfileTabContentProps {
  activeTab: TabId;
  isDark: boolean;
  t: ThemeClasses;
  onThemeChange: (theme: "light" | "dark") => void;
}

export function ProfileTabContent({ activeTab, isDark, t, onThemeChange }: ProfileTabContentProps) {
  const availableThemes = [
    { id: "light" as const, name: "Light" },
    { id: "dark" as const, name: "Dark" },
  ];

  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-4 border ${t.border} transition-all duration-300 shadow-lg shadow-black/5 min-h-[400px] ${
        isDark ? "bg-white/[0.03]" : "bg-white/30"
      }`}
    >
      {activeTab === "profile" && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>Profile Information</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Manage your personal information and account details
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-white/30"} backdrop-blur-xl mb-3`}
            >
              <UserCircle
                className={`${isDark ? "text-slate-400" : "text-slate-600"}`}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
              Profile management coming soon...
            </p>
          </div>
        </div>
      )}

      {activeTab === "themes" && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>Theme Settings</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Customize your visual experience with different themes
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {availableThemes.map((theme) => {
              const isCurrentTheme =
                (theme.id === "dark" && isDark) || (theme.id === "light" && !isDark);
              return (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    isCurrentTheme
                      ? isDark
                        ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/30"
                        : "bg-gradient-to-br from-cyan-600/30 to-blue-600/30 border border-cyan-600/40"
                      : `${t.cardHover} border ${t.border}`
                  } backdrop-blur-xl`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Palette
                      className={`${
                        isCurrentTheme
                          ? isDark
                            ? "text-cyan-400"
                            : "text-cyan-700"
                          : t.textSecondary
                      }`}
                      size={24}
                      strokeWidth={2}
                    />
                    {isCurrentTheme && (
                      <div
                        className={`w-2 h-2 rounded-full ${isDark ? "bg-cyan-400" : "bg-cyan-600"}`}
                      />
                    )}
                  </div>
                  <p
                    className={`text-sm font-semibold ${
                      isCurrentTheme ? (isDark ? "text-cyan-400" : "text-cyan-700") : t.text
                    }`}
                  >
                    {theme.name}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>Security Settings</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Manage your account security and privacy settings
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-white/30"} backdrop-blur-xl mb-3`}
            >
              <Shield
                className={`${isDark ? "text-slate-400" : "text-slate-600"}`}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
              Security settings coming soon...
            </p>
          </div>
        </div>
      )}

      {activeTab === "preferences" && (
        <div className="space-y-3">
          <div>
            <h2 className={`${t.text} text-sm font-semibold mb-1`}>User Preferences</h2>
            <p className={`${t.textSecondary} text-xs mb-3`}>
              Customize your application preferences and settings
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div
              className={`p-4 rounded-2xl ${isDark ? "bg-white/5" : "bg-white/30"} backdrop-blur-xl mb-3`}
            >
              <Settings
                className={`${isDark ? "text-slate-400" : "text-slate-600"}`}
                size={32}
                strokeWidth={1.5}
              />
            </div>
            <p className={`${t.textSecondary} text-center text-sm max-w-md`}>
              User preferences coming soon...
            </p>
          </div>
        </div>
      )}

      {activeTab === "about" && (
        <div className="space-y-4">
          {/* Contact Info Section */}
          <div
            className={`p-4 rounded-xl ${isDark ? "bg-white/5" : "bg-white/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Mail className={`${isDark ? "text-cyan-400" : "text-cyan-600"}`} size={18} />
              <h2 className={`${t.text} text-sm font-semibold`}>Contact Info</h2>
            </div>
            <div className="space-y-2">
              <a
                href="https://x.com/MaximEdogawa"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? "hover:bg-white/5" : "hover:bg-white/40"} transition-colors group`}
              >
                <svg
                  className={`w-4 h-4 ${isDark ? "text-slate-400 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className={`text-sm ${t.textSecondary} group-hover:${t.text}`}>
                  @MaximEdogawa
                </span>
                <ExternalLink
                  size={12}
                  className={`${t.textSecondary} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
              </a>
              <a
                href="https://github.com/maximedogawa"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 p-2 rounded-lg ${isDark ? "hover:bg-white/5" : "hover:bg-white/40"} transition-colors group`}
              >
                <Github
                  className={`w-4 h-4 ${isDark ? "text-slate-400 group-hover:text-white" : "text-slate-600 group-hover:text-slate-900"}`}
                />
                <span className={`text-sm ${t.textSecondary} group-hover:${t.text}`}>
                  maximedogawa
                </span>
                <ExternalLink
                  size={12}
                  className={`${t.textSecondary} opacity-0 group-hover:opacity-100 transition-opacity`}
                />
              </a>
            </div>
          </div>

          {/* Privacy Policy Section */}
          <div
            className={`p-4 rounded-xl ${isDark ? "bg-white/5" : "bg-white/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className={`${isDark ? "text-cyan-400" : "text-cyan-600"}`} size={18} />
              <h2 className={`${t.text} text-sm font-semibold`}>Privacy Policy</h2>
            </div>
            <div className={`space-y-4 text-sm ${t.textSecondary}`}>
              <p>This policy outlines our approach to your privacy when using our services.</p>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Eye className={`${isDark ? "text-slate-500" : "text-slate-400"}`} size={14} />
                  <h3 className={`${t.text} font-medium text-xs`}>Analytics or Tracking</h3>
                </div>
                <p className="text-xs leading-relaxed">
                  We do not use any analytics services and we do not track user behavior. User
                  settings, such as added offers and muted assets, are stored locally in your
                  browser and not on our servers.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Database
                    className={`${isDark ? "text-slate-500" : "text-slate-400"}`}
                    size={14}
                  />
                  <h3 className={`${t.text} font-medium text-xs`}>Personal Data</h3>
                </div>
                <p className="text-xs leading-relaxed">
                  We do not collect any personal data. Blockchain technology allows Pengui to
                  operate effectively without requiring any personal data or knowledge about its
                  users.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText
                    className={`${isDark ? "text-slate-500" : "text-slate-400"}`}
                    size={14}
                  />
                  <h3 className={`${t.text} font-medium text-xs`}>Limited Data Logging</h3>
                </div>
                <p className="text-xs leading-relaxed">
                  To protect our services from misuse, we utilize API rate limiting, based on an
                  anonymized IP address stored only in volatile memory for a short period. IPv4
                  addresses are masked to /24 and IPv6 addresses are masked to /64. The requested
                  URI, the user agent, or the request duration may be logged for debugging purposes,
                  but these logs do not contain IP addresses and cannot be linked to a specific
                  user.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link2 className={`${isDark ? "text-slate-500" : "text-slate-400"}`} size={14} />
                  <h3 className={`${t.text} font-medium text-xs`}>Blockchain Addresses</h3>
                </div>
                <p className="text-xs leading-relaxed">
                  Pengui displays maker and taker addresses on the inspect page. Most wallets create
                  a new address for every transaction, which reduces the possibility of linking a
                  user to a specific address, but be aware that blockchain transactions are
                  typically public.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <svg
                    className={`w-3.5 h-3.5 ${isDark ? "text-slate-500" : "text-slate-400"}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <h3 className={`${t.text} font-medium text-xs`}>Content Data of NFTs</h3>
                </div>
                <p className="text-xs leading-relaxed">
                  NFT creators specify a content URI in their metadata. Pengui proxies this content
                  in most cases, but certain exotic NFTs may load data directly from the origin URI
                  on the inspect page; this is similar to the Chia Wallet.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className={`${isDark ? "text-slate-500" : "text-slate-400"}`} size={14} />
                  <h3 className={`${t.text} font-medium text-xs`}>Wallet Connect</h3>
                </div>
                <p className="text-xs leading-relaxed">
                  When using Wallet Connect (optional), your browser sends encrypted requests to
                  Wallet Connect&apos;s servers that then proxy the request to your wallet. For more
                  information, please read{" "}
                  <a
                    href="https://walletconnect.network/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700"} underline`}
                  >
                    Wallet Connect&apos;s privacy policy
                  </a>
                  .
                </p>
              </div>

              <p className="text-xs italic mt-4 pt-3 border-t border-slate-500/20">
                We will notify you of any significant changes to this privacy policy through a
                prominent notice on our website or through other appropriate communication channels.
              </p>
            </div>
          </div>

          {/* About the App Section */}
          <div
            className={`p-4 rounded-xl ${isDark ? "bg-white/5" : "bg-white/30"} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className={`${isDark ? "text-cyan-400" : "text-cyan-600"}`} size={18} />
              <h2 className={`${t.text} text-sm font-semibold`}>About Pengui</h2>
            </div>
            <div className={`space-y-3 text-sm ${t.textSecondary}`}>
              <p className="text-xs leading-relaxed">
                Pengui is a decentralized trading platform built on the Chia blockchain. It provides
                a secure, transparent, and user-friendly interface for trading digital assets
                without intermediaries.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className={`p-2 rounded-lg ${isDark ? "bg-white/5" : "bg-white/30"}`}>
                  <p className={`text-xs ${t.textSecondary}`}>Version</p>
                  <p className={`text-sm font-medium ${t.text}`}>{appInfo.version}</p>
                </div>
                <div className={`p-2 rounded-lg ${isDark ? "bg-white/5" : "bg-white/30"}`}>
                  <p className={`text-xs ${t.textSecondary}`}>Network</p>
                  <p className={`text-sm font-medium ${t.text}`}>Chia Blockchain</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs">
                  For questions or concerns, contact us on{" "}
                  <a
                    href="https://x.com/MaximEdogawa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-600 hover:text-cyan-700"} underline`}
                  >
                    X (Twitter)
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
