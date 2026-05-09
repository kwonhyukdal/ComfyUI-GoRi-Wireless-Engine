/* 
 * =============================================================
 * Project: GoRi Switch Engine (고리 엔진)
 * Original Concept & Creator: GoRi (고리)
 * 
 * [License & Terms of Use]
 * 1. Personal & Non-Commercial: FREE to use. 
 *    (개인 및 비영리 목적으로는 자유롭게 무료 사용이 가능합니다.)
 *    - Individual creators, students, and hobbyists.
 *    - Personal YouTube content creation and educational purposes.
 * 
 * 2. Enterprise & Commercial Use: PAID LICENSE REQUIRED. 
 *    (기업, 단체, 또는 상업적 목적으로 이용 시 반드시 유료 라이선스를 취득해야 합니다.)
 *    - Use in corporate environments, agencies, and for-profit projects.
 *    - Commercial use without a separate license agreement is strictly prohibited.
 *    - 별도의 협의 없는 상업적 이용 및 재배포는 법적 제재를 받을 수 있습니다.
 * 
 * 3. Attribution Requirement:
 *    - When sharing workflows or content created with this engine, 
 *      attribution to "GoRi Switch Engine" is highly recommended.
 * 
 * Contact for License & Inquiries: [khd57788@gmail.com]
 * =============================================================
 */

/* 
 * [Part 4] gori_menu.js (Double-Click Close Mode)
 * 역할: 단일 클릭 시 팝업 유지 (노드 작업 가능), 더블 클릭 시에만 종료
 * 수정 사항: 
 * 1. 햄버거 메뉴 및 팝업 내부 우클릭 시 브라우저 기본 메뉴 차단 (e.preventDefault)
 * 2. 엔진 ON/OFF는 팝업 스위치에서만 제어 (햄버거 우클릭 토글 제거)
 */

export const GORI_MENU = {
    state: {
        isActive: true,
        showIndexBadge: true,
        popupSize: null,
        popupBaseSize: null,
        menuLoopStarted: false
    },

    loadState() {
        try {
            const saved = localStorage.getItem("gori_menu_state");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (typeof parsed.isActive === "boolean") this.state.isActive = parsed.isActive;
                if (typeof parsed.showIndexBadge === "boolean") this.state.showIndexBadge = parsed.showIndexBadge;
                if (parsed.popupSize && typeof parsed.popupSize.width === "number" && typeof parsed.popupSize.height === "number") {
                    this.state.popupSize = parsed.popupSize;
                }
            }
        } catch (e) { /* ignore */ }
    },

    saveState() {
        try {
            localStorage.setItem("gori_menu_state", JSON.stringify({
                isActive: this.state.isActive,
                showIndexBadge: this.state.showIndexBadge,
                popupSize: this.state.popupSize
            }));
        } catch (e) { /* ignore */ }
    },

    init() {
        this.loadState();
        const findGraphButton = () => {
            const elements = document.querySelectorAll("button, div, span");
            for (const el of elements) {
                if (el.textContent.trim() === "Graph" && el.offsetWidth > 0) {
                    return el.closest("button") || el;
                }
            }
            return null;
        };

        const updatePosition = () => {
            const graphBtn = findGraphButton();
            if (!graphBtn) return;

            let menu = document.getElementById("gori-hamburger-menu");
            if (!menu) {
                menu = document.createElement("div");
                menu.id = "gori-hamburger-menu";
                menu.innerHTML = `
                    <div style="width:28px; height:28px; background:#000; border-radius:6px; display:flex; align-items:center; justify-content:center; pointer-events:none;">
                        <svg width="14" height="10" viewBox="0 0 18 14" fill="none"><path d="M1 1H17M1 7H17M1 13H17" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>
                    </div>
                `;
                document.body.appendChild(menu);

                // --- [수정] 햄버거 메뉴 클릭/우클릭 이벤트 처리 ---

                // 1. 좌클릭: 팝업 메뉴 토글
                menu.onmousedown = (e) => {
                    if (e.button === 0) { // 좌클릭
                        e.preventDefault();
                        e.stopPropagation();
                        this.togglePopup(menu);
                    }
                };

                // 2. 우클릭: 브라우저 메뉴만 차단 (엔진 토글 없음)
                menu.oncontextmenu = (e) => {
                    e.preventDefault(); // 💡 이미지 "2026-05-05 02 03 49.png"의 윈도우 팝업 차단 핵심 코드
                    e.stopPropagation();
                };
            }

            const rect = graphBtn.getBoundingClientRect();
            if (rect.top !== 0 || rect.left !== 0) {
                Object.assign(menu.style, {
                    position: "fixed",
                    left: `${rect.right + 8}px`, // 💡 조절: Graph 버튼으로부터의 가로 간격
                    top: `${rect.top + (rect.height / 2) - 18}px`, // 💡 조절: 세로 위치 중앙 정렬
                    width: "36px",
                    height: "36px",
                    backgroundColor: "#2a2a2a",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: "9998"
                });
            }
        };

        // [핵심 변경] 단일 클릭은 무시하고 '더블 클릭' 이벤트에만 반응
        document.addEventListener("dblclick", (e) => {
            const popup = document.getElementById("gori-popup-container");
            const menu = document.getElementById("gori-hamburger-menu");

            if (popup) {
                if (!popup.contains(e.target) && !menu.contains(e.target)) {
                    popup.remove();
                }
            }
        }, true); 

        const run = () => {
            updatePosition();
            requestAnimationFrame(run);
        };
        if (!this.state.menuLoopStarted) {
            this.state.menuLoopStarted = true;
            run();
        }
    },
togglePopup(menu) {
        const existing = document.getElementById("gori-popup-container");
        if (existing) {
            existing.__goriResizeObserver?.disconnect?.();
            existing.remove();
            return;
        }

        const popup = document.createElement("div");
        popup.id = "gori-popup-container";
        const mRect = menu.getBoundingClientRect();

        Object.assign(popup.style, {
            position: "fixed",
            top: `${mRect.bottom + 6}px`,
            left: `${mRect.left}px`,
            minWidth: "180px",
            backgroundColor: "#2a2a2a",
            borderRadius: "8px",
            border: "1px solid #3d3d3d",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            zIndex: "10000",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            overflow: "auto",
            resize: "both"
        });
        popup.style.position = "fixed";
        popup.style.setProperty("--gori-ui-scale", "1");

        // 💡 추가: 팝업 영역 자체에서도 우클릭 브라우저 메뉴 차단
        popup.oncontextmenu = (e) => e.preventDefault();

        const render = () => {
            const engineColor = this.state.isActive ? "#00ff88" : "#ff4444";
            const engineText = this.state.isActive ? "Engine Active" : "Engine Paused";
            const badgeColor = this.state.showIndexBadge ? "#00ff88" : "#ff4444";
            const badgeText = this.state.showIndexBadge ? "Index Box Active" : "Index Box Hidden";
            
            popup.innerHTML = `
                <div id="gori-switch-btn" style="display:flex; align-items:center; justify-content:space-between; padding:calc(8px * var(--gori-ui-scale)) calc(11px * var(--gori-ui-scale)); background:#000; border-radius:calc(5px * var(--gori-ui-scale)); cursor:pointer; user-select:none;">
                    <div style="display:flex; align-items:center; gap:calc(8px * var(--gori-ui-scale));">
                        <div style="width:calc(8px * var(--gori-ui-scale)); height:calc(8px * var(--gori-ui-scale)); background:${engineColor}; border-radius:50%; box-shadow: 0 0 calc(6px * var(--gori-ui-scale)) ${engineColor};"></div>
                        <span style="color:#eee; font-size:calc(10px * var(--gori-ui-scale)); font-weight:bold;">${engineText}</span>
                    </div>
                    <div style="color:${engineColor}; font-size:calc(8px * var(--gori-ui-scale)); font-weight:bold;">${this.state.isActive ? "ON" : "OFF"}</div>
                </div>
                <div id="gori-index-badge-btn" style="display:flex; align-items:center; justify-content:space-between; padding:calc(8px * var(--gori-ui-scale)) calc(11px * var(--gori-ui-scale)); background:#000; border-radius:calc(5px * var(--gori-ui-scale)); cursor:pointer; user-select:none; margin-top:calc(5px * var(--gori-ui-scale));">
                    <div style="display:flex; align-items:center; gap:calc(8px * var(--gori-ui-scale));">
                        <div style="width:calc(8px * var(--gori-ui-scale)); height:calc(8px * var(--gori-ui-scale)); background:${badgeColor}; border-radius:50%; box-shadow: 0 0 calc(6px * var(--gori-ui-scale)) ${badgeColor};"></div>
                        <span style="color:#eee; font-size:calc(10px * var(--gori-ui-scale)); font-weight:bold;">${badgeText}</span>
                    </div>
                    <div style="color:${badgeColor}; font-size:calc(8px * var(--gori-ui-scale)); font-weight:bold;">${this.state.showIndexBadge ? "ON" : "OFF"}</div>
                </div>
            `;

            const btn = popup.querySelector("#gori-switch-btn");
            const badgeBtn = popup.querySelector("#gori-index-badge-btn");
            
            // 좌클릭 시 토글
            btn.onclick = (e) => {
                e.stopPropagation();
                this.state.isActive = !this.state.isActive;
                render();
                this.saveState();
            };

            // 💡 추가: 팝업 내 버튼 우클릭 시에도 브라우저 메뉴 차단 및 토글 지원
            btn.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.state.isActive = !this.state.isActive;
                render();
                this.saveState();
            };

            badgeBtn.onclick = (e) => {
                e.stopPropagation();
                this.state.showIndexBadge = !this.state.showIndexBadge;
                render();
                this.saveState();
            };

            badgeBtn.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.state.showIndexBadge = !this.state.showIndexBadge;
                render();
                this.saveState();
            };
        };

        document.body.appendChild(popup);
        render();

        const applyPopupSizeBounds = () => {
            popup.style.width = "auto";
            popup.style.height = "auto";

            const baseWidth = Math.ceil(popup.scrollWidth);
            const baseHeight = Math.ceil(popup.scrollHeight);
            if (!this.state.popupBaseSize) {
                this.state.popupBaseSize = { width: baseWidth, height: baseHeight };
            }
            const maxWidth = Math.ceil(baseWidth * 3);
            const maxHeight = Math.ceil(baseHeight * 3);

            let width = baseWidth;
            let height = baseHeight;
            if (this.state.popupSize) {
                width = Math.min(Math.max(this.state.popupSize.width, baseWidth), maxWidth);
                height = Math.min(Math.max(this.state.popupSize.height, baseHeight), maxHeight);
            }

            popup.style.minWidth = `${baseWidth}px`;
            popup.style.minHeight = `${baseHeight}px`;
            popup.style.maxWidth = `${maxWidth}px`;
            popup.style.maxHeight = `${maxHeight}px`;
            popup.style.width = `${width}px`;
            popup.style.height = `${height}px`;
            this.state.popupSize = { width, height };
        };

        const syncScaleByPopupSize = () => {
            const base = this.state.popupBaseSize || { width: popup.offsetWidth, height: popup.offsetHeight };
            const ratioW = popup.offsetWidth / Math.max(base.width, 1);
            const ratioH = popup.offsetHeight / Math.max(base.height, 1);
            const scale = Math.min(3, Math.max(1, Math.min(ratioW, ratioH)));
            popup.style.setProperty("--gori-ui-scale", scale.toFixed(3));
        };

        applyPopupSizeBounds();
        syncScaleByPopupSize();

        const persistAndSync = () => {
            this.state.popupSize = {
                width: popup.offsetWidth,
                height: popup.offsetHeight
            };
            syncScaleByPopupSize();
            this.saveState();
        };

        // 리사이즈 핸들 드래그 중에도 실시간 동기화
        const sizeObserver = new ResizeObserver(() => {
            persistAndSync();
        });
        sizeObserver.observe(popup);
        popup.__goriResizeObserver = sizeObserver;

        popup.addEventListener("mouseup", persistAndSync);
    }
};