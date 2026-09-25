import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";
import { signUp, signIn } from "@/lib/auth-client";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/auth-client", () => ({
  signUp: {
    email: vi.fn(),
  },
  signIn: {
    social: vi.fn(),
  },
}));

const mockedSignUpEmail = vi.mocked(signUp.email);
const mockedSignInSocial = vi.mocked(signIn.social);

describe("RegisterPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    mockedSignUpEmail.mockReset();
    mockedSignInSocial.mockReset();
  });

  it("shows 'Konto erstellen' as the page title", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("heading", { name: /^konto erstellen$/i }),
    ).toBeInTheDocument();
  });

  it("shows a 'Login' cross-link back to the login page (per the confirmed exception)", () => {
    render(<RegisterPage />);

    expect(
      screen.getByRole("link", { name: /^login$/i }),
    ).toHaveAttribute("href", "/login");
  });

  it("redirects to / on successful registration", async () => {
    mockedSignUpEmail.mockResolvedValue({ data: {}, error: null } as never);
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "new@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/passwort/i), {
      target: { value: "correcthorse" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^konto erstellen$/i }));

    await waitFor(() => {
      expect(mockedSignUpEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@b.com", password: "correcthorse" })
      );
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows an already-registered error and does not redirect when the email is taken", async () => {
    mockedSignUpEmail.mockResolvedValue({
      data: null,
      error: {
        code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
        message: "User already exists. Use another email.",
      },
    } as never);
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "taken@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/passwort/i), {
      target: { value: "correcthorse" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^konto erstellen$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/bereits/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error and does not redirect when the client call rejects outright", async () => {
    mockedSignUpEmail.mockRejectedValue(new Error("network exploded"));
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/passwort/i), {
      target: { value: "somepass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^konto erstellen$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent(/network exploded/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a Google sign-in button that invokes the client's Google flow", async () => {
    mockedSignInSocial.mockResolvedValue({ data: {}, error: null } as never);
    render(<RegisterPage />);

    const googleButton = screen.getByRole("button", { name: /google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockedSignInSocial).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" })
      );
    });
  });
});
