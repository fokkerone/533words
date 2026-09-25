import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";
import { signIn } from "@/lib/auth-client";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/auth-client", () => ({
  signIn: {
    email: vi.fn(),
    social: vi.fn(),
  },
}));

const mockedSignInEmail = vi.mocked(signIn.email);
const mockedSignInSocial = vi.mocked(signIn.social);

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockReset();
    mockedSignInEmail.mockReset();
    mockedSignInSocial.mockReset();
  });

  it("redirects to / on successful login", async () => {
    mockedSignInEmail.mockResolvedValue({ data: {}, error: null } as never);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/passwort/i), {
      target: { value: "correcthorse" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    await waitFor(() => {
      expect(mockedSignInEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: "a@b.com", password: "correcthorse" })
      );
    });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/");
    });
  });

  it("shows a generic error and does not redirect on incorrect credentials", async () => {
    mockedSignInEmail.mockResolvedValue({
      data: null,
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "some very specific internal detail" },
    } as never);
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "wrong@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/passwort/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/e-mail oder passwort ungültig/i);
    expect(alert).not.toHaveTextContent(/some very specific internal detail/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a generic error and does not redirect when the client call rejects outright", async () => {
    mockedSignInEmail.mockRejectedValue(new Error("network exploded"));
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/e-mail/i), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/passwort/i), {
      target: { value: "somepass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^login$/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/e-mail oder passwort ungültig/i);
    expect(alert).not.toHaveTextContent(/network exploded/i);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a Google sign-in button that invokes the client's Google flow", async () => {
    mockedSignInSocial.mockResolvedValue({ data: {}, error: null } as never);
    render(<LoginPage />);

    const googleButton = screen.getByRole("button", { name: /google/i });
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockedSignInSocial).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" })
      );
    });
  });
});
