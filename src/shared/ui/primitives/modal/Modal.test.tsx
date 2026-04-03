import { describe, it, expect } from "bun:test";
import { render, screen, waitFor } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import ModalImpl from "./ModalImpl";

describe("Modal", () => {
  it("should render modal with children", async () => {
    const onClose = () => {};
    render(
      <ModalImpl onClose={onClose}>
        <div>Modal Content</div>
      </ModalImpl>
    );
    await waitFor(() => {
      expect(screen.getByText("Modal Content")).toBeInTheDocument();
    });
  });

  it("should call onClose when clicking overlay", async () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    render(
      <ModalImpl onClose={onClose}>
        <div>Modal Content</div>
      </ModalImpl>
    );

    const overlay = await waitFor(() => {
      const el = document.querySelector("[data-slot='dialog-overlay']") as HTMLElement | null;
      expect(el).toBeTruthy();
      return el!;
    });

    await userEvent.click(overlay);
    expect(closed).toBe(true);
  });

  it("should not call onClose when clicking content", async () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    render(
      <ModalImpl onClose={onClose}>
        <div>Modal Content</div>
      </ModalImpl>
    );

    const content = await screen.findByText("Modal Content");
    await userEvent.click(content);
    expect(closed).toBe(false);
  });

  it("should not call onClose when closeOnOverlayClick is false", async () => {
    let closed = false;
    const onClose = () => {
      closed = true;
    };

    render(
      <ModalImpl onClose={onClose} closeOnOverlayClick={false}>
        <div>Modal Content</div>
      </ModalImpl>
    );

    const overlay = await waitFor(() => {
      const el = document.querySelector("[data-slot='dialog-overlay']") as HTMLElement | null;
      expect(el).toBeTruthy();
      return el!;
    });

    await userEvent.click(overlay);
    expect(closed).toBe(false);
  });

  it("should apply custom maxWidth", async () => {
    const onClose = () => {};
    render(
      <ModalImpl onClose={onClose} maxWidth="max-w-2xl">
        <div>Modal Content</div>
      </ModalImpl>
    );

    const content = await screen.findByRole("dialog");
    const modalContent = content.closest(".max-w-2xl");
    expect(modalContent).toBeInTheDocument();
  });

  it("should apply custom className", async () => {
    const onClose = () => {};
    render(
      <ModalImpl onClose={onClose} className="custom-modal">
        <div>Modal Content</div>
      </ModalImpl>
    );

    const content = await screen.findByRole("dialog");
    const modalContent = content.closest(".custom-modal");
    expect(modalContent).toBeInTheDocument();
  });
});
