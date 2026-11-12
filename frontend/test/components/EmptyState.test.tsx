import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import EmptyState from "../../src/shared/components/EmptyState.jsx";

describe("Frontend Component Test: EmptyState Component (<EmptyState />)", () => {
  it("1. Me-render judul dan deskripsi default dengan benar", () => {
    render(<EmptyState />);
    expect(screen.getByText("Tidak ada data")).toBeInTheDocument();
    expect(screen.getByText("Belum ada data untuk ditampilkan saat ini.")).toBeInTheDocument();
  });

  it("2. Me-render judul kustom dan deskripsi kustom", () => {
    render(
      <EmptyState
        title="Keranjang Masih Kosong"
        description="Yuk cari produk streetwear favoritmu sekarang!"
      />
    );
    expect(screen.getByText("Keranjang Masih Kosong")).toBeInTheDocument();
    expect(screen.getByText("Yuk cari produk streetwear favoritmu sekarang!")).toBeInTheDocument();
  });

  it("3. Me-render tombol aksi onAction dan merespons klik pengguna", () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="Wishlist Kosong"
        actionLabel="Mulai Belanja"
        onAction={handleAction}
      />
    );

    const actionButton = screen.getByRole("button", { name: /Mulai Belanja/i });
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it("4. Me-render Link navigasi saat actionLink disertakan", () => {
    render(
      <MemoryRouter>
        <EmptyState
          title="Tidak Ada Pesanan"
          actionLabel="Ke Katalog"
          actionLink="/catalog"
        />
      </MemoryRouter>
    );

    const link = screen.getByRole("link", { name: /Ke Katalog/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/catalog");
  });
});
