"use client";

import dynamic from "next/dynamic";
import { type ReactNode } from "react";

export interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  className?: string;
  closeOnOverlayClick?: boolean;
}

// Lazy-load the Dialog implementation — only fetched when a modal is first shown
const ModalImpl = dynamic(() => import("./ModalImpl"), { ssr: false });

/**
 * Modal — accessible overlay dialog backed by shadcn's Dialog (Radix UI).
 *
 * Public interface is identical to the old custom Modal so call sites need no
 * changes. Renders when mounted (parent controls visibility via conditional
 * rendering), closes via `onClose` callback on overlay click or Escape key.
 *
 * @example
 * {showModal && (
 *   <Modal onClose={() => setShowModal(false)} maxWidth="max-w-xl">
 *     <div>...</div>
 *   </Modal>
 * )}
 */
export default function Modal(props: ModalProps) {
  return <ModalImpl {...props} />;
}
