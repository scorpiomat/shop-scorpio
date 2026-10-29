document.addEventListener("DOMContentLoaded", () => {
    const gameSelect = document.getElementById("game");
    const packageSelect = document.getElementById("package");
    const playerId = document.getElementById("playerId");
    const serverId = document.getElementById("serverId");
    const serverField = document.getElementById("serverField");
    const paymentSelect = document.getElementById("payment");
    const orderForm = document.getElementById("orderForm");
    const totalPrice = document.getElementById("totalPrice");
    const message = document.getElementById("message");
    const searchGame = document.getElementById("searchGame");
    const gameCards = document.querySelectorAll(".game-card");
    const submitButton = orderForm.querySelector(
        'button[type="submit"]'
    );

    let packages = [];

    function rupiah(value) {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function showMessage(text, type = "info") {
        message.textContent = text;
        message.style.color =
            type === "success" ? "#86efac" :
            type === "error" ? "#fca5a5" :
            "#d8b4fe";
    }

    // Klik kartu game untuk memilih dan menuju form.
    function selectGame(gameId) {
        gameSelect.value = gameId;
        gameSelect.dispatchEvent(new Event("change"));

        gameCards.forEach((card) => {
            const selected = card.dataset.game === gameId;
            card.classList.toggle("selected", selected);
            card.setAttribute("aria-pressed", String(selected));
        });

        document.getElementById("pesanan").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    gameCards.forEach((card) => {
        card.addEventListener("click", () => {
            selectGame(card.dataset.game);
        });
    });

    // Server ID hanya wajib untuk Mobile Legends.
    function updateServerField() {
        const needsServer = gameSelect.value === "ml";

        serverField.classList.toggle("hidden", !needsServer);
        serverId.required = needsServer;

        if (!needsServer) {
            serverId.value = "";
        }
    }

    gameSelect.addEventListener("change", () => {
        updateServerField();

        gameCards.forEach((card) => {
            const selected = card.dataset.game === gameSelect.value;
            card.classList.toggle("selected", selected);
            card.setAttribute("aria-pressed", String(selected));
        });
    });

    // Pencarian kartu game.
    searchGame.addEventListener("input", () => {
        const keyword = searchGame.value.toLowerCase().trim();

        gameCards.forEach((card) => {
            card.hidden = !card.textContent
                .toLowerCase()
                .includes(keyword);
        });
    });

    // Muat paket dari Flask.
    async function loadPackages() {
        packageSelect.innerHTML =
            '<option value="">Memuat paket...</option>';

        try {
            const response = await fetch("/api/packages");

            if (!response.ok) {
                throw new Error("Gagal memuat paket.");
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Format paket tidak sesuai.");
            }

            packages = data;
            packageSelect.innerHTML =
                '<option value="">-- Pilih nominal --</option>';

            packages.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent =
                    `${item.name} - ${item.amount} - ` +
                    rupiah(item.price);

                packageSelect.appendChild(option);
            });

            updateTotal();
        } catch (error) {
            console.error(error);
            packageSelect.innerHTML =
                '<option value="">Paket tidak tersedia</option>';
            showMessage(
                "Paket gagal dimuat. Periksa server Flask.",
                "error"
            );
        }
    }

    function updateTotal() {
        const selected = packages.find(
            (item) => item.id === packageSelect.value
        );

        totalPrice.textContent = rupiah(
            selected ? selected.price : 0
        );
    }

    packageSelect.addEventListener("change", updateTotal);

    // Kirim pesanan ke Flask.
    orderForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!gameSelect.value) {
            showMessage("Pilih game terlebih dahulu.", "error");
            gameSelect.focus();
            return;
        }

        if (!playerId.value.trim()) {
            showMessage("Masukkan ID pemain.", "error");
            playerId.focus();
            return;
        }

        if (gameSelect.value === "ml" && !serverId.value.trim()) {
            showMessage("Masukkan Server ID Mobile Legends.", "error");
            serverId.focus();
            return;
        }

        if (!packageSelect.value || !paymentSelect.value) {
            showMessage(
                "Pilih paket dan metode pembayaran.",
                "error"
            );
            return;
        }

        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = "Memproses...";
        showMessage("Sedang membuat pesanan...");

        try {
            const response = await fetch("/api/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    game_id: gameSelect.value,
                    player_id: playerId.value.trim(),
                    server_id: serverId.value.trim(),
                    package_id: packageSelect.value,
                    payment_method: paymentSelect.value
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.error || "Pesanan gagal dibuat."
                );
            }

            showMessage(
                `Pesanan berhasil dibuat. Kode: ${result.order_code}. ` +
                `Status: ${result.status}. ` +
                `${result.payment_note || ""}`,
                "success"
            );

            orderForm.reset();

            gameCards.forEach((card) => {
                card.classList.remove("selected");
                card.setAttribute("aria-pressed", "false");
            });

            updateServerField();
            updateTotal();
        } catch (error) {
            console.error(error);
            showMessage(error.message, "error");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    });

    updateServerField();
    updateTotal();
    loadPackages();
});