import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import Button from "../../src/shared/components/Button.jsx";

describe("Frontend Component Test: Button Component (<Button />)", () => {
  it("1. Me-render teks tombol dengan benar", () => {
    render(<Button>Beli Sekarang</Button>);
    const btn = screen.getByRole("button", { name: /Beli Sekarang/i });
    expect(btn).toBeInTheDocument();
  });

  it("2. Memicu fungsi onClick saat tombol diklik", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Tambah ke Keranjang</Button>);
    const btn = screen.getByRole("button", { name: /Tambah ke Keranjang/i });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("3. Menampilkan indikator loading dan menonaktifkan tombol saat isLoading=true", () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading={true} loadingText="Sedang Memproses..." onClick={handleClick}>
        Bayar
      </Button>
    );

    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(screen.getByText("Sedang Memproses...")).toBeInTheDocument();

    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("4. Tombol tidak dapat diklik saat atribut disabled=true", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    const btn = screen.getByRole("button", { name: /Disabled Button/i });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
