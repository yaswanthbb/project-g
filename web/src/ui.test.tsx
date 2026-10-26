import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, test, expect } from "vitest";
import { CopyButton } from "./ui";
test("copy has feedback without a status update", async () => {
  const user = userEvent.setup();
  const copy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  render(
    <CopyButton text="A thoughtful message" label="Copy WhatsApp message" />,
  );
  await user.click(screen.getByRole("button"));
  expect(copy).toHaveBeenCalledWith("A thoughtful message");
  expect(screen.getByText("Copied")).toBeVisible();
});
test("copy stays disabled before approval", () => {
  render(<CopyButton text="message" label="Copy WhatsApp message" disabled />);
  expect(screen.getByRole("button")).toBeDisabled();
});
