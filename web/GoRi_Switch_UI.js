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

import { app } from "../../scripts/app.js";
import { GORI_CONFIG } from "./gori_config.js";
import { GORI_RENDERER } from "./gori_render.js";
import { GORI_MENU } from "./gori_menu.js";
import { GORI_CORE } from "./gori_core.js";

app.registerExtension({
    name: "GoRi.SwitchEngine",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (GORI_CONFIG.isExcluded(nodeData)) return;

        // 1. 노드 상태 저장 (직렬화)
        const originalOnSerialize = nodeType.prototype.onSerialize;
        nodeType.prototype.onSerialize = function(o) {
            originalOnSerialize?.apply(this, arguments);
            o.gori_states = {
                gori_index: this.gori_index, 
                inputs: this.inputs?.map(s => ({ active: s.gori_active, channel: s.gori_channel })),
                outputs: this.outputs?.map(s => ({ active: s.gori_active, channel: s.gori_channel }))
            };
        };

        // 2. 노드 상태 복구
        const originalOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function(o) {
            originalOnConfigure?.apply(this, arguments);
            if (o.gori_states) {
                if ((window.GORI.pasteLevel || 0) > 0) {
                    this.__gori_pending_normalize = true;
                }
                this.gori_index = o.gori_states.gori_index;
                o.gori_states.inputs?.forEach((s, i) => { 
                    if (this.inputs && this.inputs[i]) { 
                        this.inputs[i].gori_active = s.active; 
                        this.inputs[i].gori_channel = s.channel; 
                    } 
                });
                o.gori_states.outputs?.forEach((s, i) => { 
                    if (this.outputs && this.outputs[i]) { 
                        this.outputs[i].gori_active = s.active; 
                        this.outputs[i].gori_channel = s.channel; 
                    } 
                });
            }
        };

        // 2.1 복제(Clone) 메서드 가로채기 (디버그 로깅 + pending 플래그)
        const originalClone = nodeType.prototype.clone;
        nodeType.prototype.clone = function() {
            const result = originalClone.apply(this, arguments);
            if (result) {
                result.__gori_pending_normalize = true;
                const isLI = (this.type||'').includes('LoadImage');
                const sv = JSON.stringify(this.widgets_values);
                const dv = JSON.stringify(result.widgets_values);
                if (sv !== dv || isLI) {
                    console.log('🐛 CLONE:', this.type, this.id, '→', result.id,
                        'src_w:', sv.slice(0,80), 'dst_w:', dv.slice(0,80));
                }
            }
            return result;
        };
        // 3. 시각화 호출
        const originalOnDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function(ctx) {
            originalOnDrawForeground?.apply(this, arguments);
            if (this.__gori_pending_normalize) return;
            GORI_RENDERER.drawVisuals(ctx, this, app);
        };

        // 4. 마우스 좌클릭 스위치 토글
        const originalMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e) {
            if (e.button === 0) {
                const check = (slots, isInput) => {
                    if (!slots) return false;
                    for (let i = 0; i < slots.length; i++) {
                        const p = GORI_RENDERER.getSwitchPos(this, slots[i], isInput, i);
                        if (Math.sqrt((e.canvasX - p.x) ** 2 + (e.canvasY - p.y) ** 2) < 12) {
                            slots[i].gori_active = !slots[i].gori_active;
                            this.setDirtyCanvas(true, true);
                            return true;
                        }
                    }
                    return false;
                };
                if (check(this.inputs, true) || check(this.outputs, false)) return true;
            }
            return originalMouseDown?.apply(this, arguments);
        };
    },

    async setup() {
        GORI_MENU.init();  
        GORI_CORE.init();  
        console.log("✅ GoRi 엔진 패치 로드됨: 복사/붙여넣기 보정 v2026-05-08");

        const isSenderDisabled = (node) => {
            const mode = Number(node?.mode ?? 0);
            const alwaysMode = (typeof LiteGraph !== "undefined" && typeof LiteGraph.ALWAYS === "number")
                ? LiteGraph.ALWAYS
                : 0;
            return mode !== alwaysMode;
        };

        const normalizePastedNodes = (nodesToNormalize, ctx = {}) => {
            const rawNodes = (nodesToNormalize || []).filter(Boolean);
            const clonedOnly = rawNodes.filter((n) => n.__gori_cloned);
            const pastedNodes = clonedOnly.length ? clonedOnly : rawNodes;
            if (!pastedNodes.length) return;

            console.log(`📋 GoRi 복사 보정 시작: 대상 노드 ${pastedNodes.length}개`);

            // 단일 노드 복사는 내부 유지할 연결이 없으므로 완전 초기화
            if (pastedNodes.length === 1) {
                const node = pastedNodes[0];
                [...(node.inputs || []), ...(node.outputs || [])].forEach((slot) => {
                    slot.gori_active = false;
                    slot.gori_channel = "";
                    slot.gori_auto_blocked = false;
                });
                node.__gori_cloned = false;
                node.__gori_normalized = true;
                node.__gori_pending_normalize = false;
                node.setDirtyCanvas?.(true, true);
                app.canvas?.setDirty?.(true, true);
                console.log("📋 GoRi 단일 복사: 스위치/채널 초기화 완료");
                return;
            }

            const beforeGraphNodes = Array.isArray(ctx.beforeGraphNodes) ? ctx.beforeGraphNodes : null;
            const receiverChannelsBefore = new Set();
            if (beforeGraphNodes) {
                beforeGraphNodes.forEach((node) => {
                    node.inputs?.forEach((slot) => {
                        if (slot.gori_active && slot.gori_channel) receiverChannelsBefore.add(slot.gori_channel);
                    });
                });
            }

            const pastedChannels = new Set();
            pastedNodes.forEach((node) => {
                [...(node.inputs || []), ...(node.outputs || [])].forEach((slot) => {
                    if (slot.gori_channel) pastedChannels.add(slot.gori_channel);
                });
            });

            if (!pastedChannels.size) {
                pastedNodes.forEach((node) => { node.__gori_cloned = false; node.__gori_normalized = true; node.__gori_pending_normalize = false; });
                console.log("📋 GoRi 묶음 복사: 채널이 없어서 보정 종료");
                return;
            }

            // 복사 블록 전용 새 채널로 재부여: 원본 워크플로우와 채널 충돌 방지
            const blockToken = `${Date.now().toString(36)}_${Math.floor(Math.random() * 1000).toString(36)}`;
            const remap = new Map();
            const reverseRemap = new Map();
            let chIndex = 1;
            [...pastedChannels].forEach((oldCh) => {
                const newCh = `CH_${blockToken}_${String(chIndex).padStart(3, "0")}`;
                remap.set(oldCh, newCh);
                reverseRemap.set(newCh, oldCh);
                chIndex++;
            });

            pastedNodes.forEach((node) => {
                node.inputs?.forEach((slot) => {
                    if (remap.has(slot.gori_channel)) slot.gori_channel = remap.get(slot.gori_channel);
                });
                node.outputs?.forEach((slot) => {
                    if (remap.has(slot.gori_channel)) slot.gori_channel = remap.get(slot.gori_channel);
                });
            });

            let turnedOffOutputs = 0;
            pastedNodes.forEach((node) => {
                node.outputs?.forEach((out) => {
                    if (!out.gori_active || !out.gori_channel) return;

                    const hasReceiverInPasted = pastedNodes.some((target) =>
                        target.inputs?.some((input) =>
                            input.gori_active && input.gori_channel === out.gori_channel
                        )
                    );

                    const oldCh = reverseRemap.get(out.gori_channel) || null;
                    const wasUsedBefore = oldCh ? receiverChannelsBefore.has(oldCh) : true;
                    if (wasUsedBefore && !hasReceiverInPasted) {
                        out.gori_active = false;
                        turnedOffOutputs += 1;
                    }
                });
                node.__gori_cloned = false;
                node.__gori_normalized = true;
                node.__gori_pending_normalize = false;
                node.setDirtyCanvas?.(true, true);
            });

            app.canvas?.setDirty?.(true, true);
            console.log(`📋 GoRi 묶음 복사: 채널 ${remap.size}개 새로부여, 잘린 송출 OFF ${turnedOffOutputs}개`);
        };

        // 선택된 노드(송신자)의 출력 채널을 수신 중인 다른 노드 입력 스위치 OFF
        const disableReceiversBySenderNodes = (senderNodes) => {
            const allNodes = app.graph?._nodes || [];
            const senderChannels = new Set();

            (senderNodes || []).forEach((node) => {
                node.outputs?.forEach((slot) => {
                    if (slot.gori_channel) {
                        senderChannels.add(slot.gori_channel);
                    }
                });
            });

            if (senderChannels.size === 0) return;

            let changedSlots = 0;
            allNodes.forEach((node) => {
                node.inputs?.forEach((slot) => {
                    if (!slot.gori_active || !slot.gori_channel) return;
                    if (senderChannels.has(slot.gori_channel)) {
                        slot.gori_active = false;
                        slot.gori_auto_blocked = true;
                        changedSlots++;
                    }
                });
                if (changedSlots > 0) {
                    node.setDirtyCanvas?.(true, true);
                }
            });

            if (changedSlots > 0) {
                app.canvas.setDirty(true, true);
                console.log(`📴 GoRi: 송신 차단 채널을 수신 중인 스위치 ${changedSlots}개를 OFF 처리했습니다.`);
            }
        };

        // 전체 그래프를 지속 감시해서 "비활성 송신자 채널" 수신 스위치를 항상 차단
        const enforceReceiverBlockFromDisabledSenders = () => {
            const allNodes = app.graph?._nodes || [];
            if (!allNodes.length) return;

            const blockedChannels = new Set();
            allNodes.forEach((node) => {
                if (!isSenderDisabled(node)) return;
                node.outputs?.forEach((slot) => {
                    if (slot.gori_channel) blockedChannels.add(slot.gori_channel);
                });
            });

            let changedSlots = 0;
            allNodes.forEach((node) => {
                node.inputs?.forEach((slot) => {
                    if (!slot.gori_channel && slot.gori_auto_blocked) {
                        slot.gori_auto_blocked = false;
                    }

                    // 차단 상태 진입: 자동으로 OFF
                    if (slot.gori_active && slot.gori_channel && blockedChannels.has(slot.gori_channel)) {
                        slot.gori_active = false;
                        slot.gori_auto_blocked = true;
                        changedSlots++;
                        return;
                    }

                    // 차단 해제: 자동으로 다시 ON (자동 차단했던 슬롯만 복구)
                    if (!slot.gori_active && slot.gori_auto_blocked && slot.gori_channel && !blockedChannels.has(slot.gori_channel)) {
                        slot.gori_active = true;
                        slot.gori_auto_blocked = false;
                        changedSlots++;
                    }
                });
                if (changedSlots > 0) node.setDirtyCanvas?.(true, true);
            });

            if (changedSlots > 0) {
                app.canvas.setDirty(true, true);
                console.log(`📴 GoRi: 비활성 송신 채널 수신 스위치 ${changedSlots}개 자동 차단.`);
            }
        };

        const getSelectedValues = (sel) => {
            if (!sel) return [];
            if (sel instanceof Map) return [...sel.values()];
            return Object.values(sel);
        };

        // ComfyUI의 실제 단축키 처리 루틴에 직접 후킹 (Ctrl+B / Ctrl+M)
        const patchCanvasClipboardMethods = () => {
            if (typeof LGraphCanvas === "undefined" || !LGraphCanvas?.prototype) return false;
            if (LGraphCanvas.prototype.__goriClipboardMethodsPatched) return true;

            const hasInternalPaste = typeof LGraphCanvas.prototype._pasteFromClipboard === "function";
            const methodsToPatch = [
                "_pasteFromClipboard",
                "pasteFromClipboard",
                "paste"
            ];
            const copyOrig = LGraphCanvas.prototype.copyToClipboard;
            if (typeof copyOrig === "function" && !copyOrig.__goriPatched) {
                LGraphCanvas.prototype.copyToClipboard = function() {
                    const selected = getSelectedValues(this.selected_nodes);
                    console.log(`📋 GoRi copyToClipboard: 선택 노드 ${selected.length}개`, selected.map(n => `${n.type}[${n.id}]`));
                    return copyOrig.apply(this, arguments);
                };
                LGraphCanvas.prototype.copyToClipboard.__goriPatched = true;
            }

            methodsToPatch.forEach((methodName) => {
                const original = LGraphCanvas.prototype[methodName];
                if (typeof original !== "function") return;
                if (original.__goriPatched) return;

                const wrapped = function() {
                    window.GORI.pasteLevel = (window.GORI.pasteLevel || 0) + 1;
                    try {
                        return original.apply(this, arguments);
                    } finally {
                        window.GORI.pasteLevel--;
                    }
                };
                wrapped.__goriPatched = true;
                LGraphCanvas.prototype[methodName] = wrapped;
            });

            LGraphCanvas.prototype.__goriClipboardMethodsPatched = true;
            return true;
        };

        const patchProcessKey = () => {
            if (typeof LGraphCanvas === "undefined" || !LGraphCanvas?.prototype) return false;
            if (LGraphCanvas.prototype.__goriProcessKeyPatched) return true;

            const originalProcessKey = LGraphCanvas.prototype.processKey;
            if (typeof originalProcessKey !== "function") return false;

            LGraphCanvas.prototype.processKey = function(e) {
                const key = (e?.key || "").toLowerCase();
                const result = originalProcessKey.apply(this, arguments);

                if (e?.ctrlKey && !e?.shiftKey && (key === "b" || key === "m")) {
                    setTimeout(() => {
                        const selectedNodes = Object.values(app.canvas?.selected_nodes || {});
                        disableReceiversBySenderNodes(selectedNodes);
                    }, 0);
                }
                return result;
            };
            LGraphCanvas.prototype.__goriProcessKeyPatched = true;
            return true;
        };

        const patchLGraphAddMethods = () => {
            if (typeof LGraph === "undefined" || !LGraph?.prototype) return false;
            if (LGraph.prototype.__goriAddMethodsPatched) return true;

            const methodNames = ["add", "addNode"];

            methodNames.forEach((methodName) => {
                const original = LGraph.prototype[methodName];
                if (typeof original !== "function") return;
                if (original.__goriPatched) return;

                const wrapped = function() {
                    if (this && this.__goriAddTxRunning) {
                        return original.apply(this, arguments);
                    }
                    if (this) this.__goriAddTxRunning = true;

                    const result = original.apply(this, arguments);

                    if (this) this.__goriAddTxRunning = false;
                    return result;
                };
                wrapped.__goriPatched = true;
                LGraph.prototype[methodName] = wrapped;
            });

            LGraph.prototype.__goriAddMethodsPatched = true;
            return true;
        };

        const patchGraphAddMethods = () => {
            const graph = app.graph;
            if (!graph) return false;
            if (graph.__goriAddMethodsPatched) return true;

            const methodNames = ["add", "addNode"];

            methodNames.forEach((methodName) => {
                const original = graph[methodName];
                if (typeof original !== "function") return;
                if (original.__goriPatched) return;

                const wrapped = function() {
                    if (this && this.__goriAddTxRunning) {
                        return original.apply(this, arguments);
                    }
                    if (this) this.__goriAddTxRunning = true;

                    const result = original.apply(this, arguments);

                    if (this) this.__goriAddTxRunning = false;
                    return result;
                };
                wrapped.__goriPatched = true;
                graph[methodName] = wrapped;
            });

            graph.__goriAddMethodsPatched = true;
            return true;
        };

        // Alt+drag 멀티클론: canvas 인스턴스의 selected_nodes setter를 가로채
        // LiteGraph가 selectNode()로 selected_nodes를 교체할 때 추가 클론을 주입
        const patchAltDragMultiClone = () => {
            const canvas = app?.canvas;
            if (!canvas) return false;
            if (canvas.__goriPDMultiPatched) return true;

            // selected_nodes setter 가로채기: selectNode() 호출 시 추가 클론 자동 주입
            // __goriPDClones를 소비하지 않음 → 드래그 동안 여러 번 selectNode()가 호출되어도 계속 주입
            let _sn = canvas.selected_nodes;
            Object.defineProperty(canvas, 'selected_nodes', {
                get: () => _sn,
                set: (v) => {
                    _sn = v;
                    if (v && window.GORI.pdClones?.length) {
                        const isMap = v instanceof Map;
                        for (const c of window.GORI.pdClones) {
                            if (isMap) { if (!v.has(c.id)) v.set(c.id, c); }
                            else { if (!v[c.id]) v[c.id] = c; }
                        }
                    }
                },
                configurable: true
            });

            // capture phase: Alt+drag 멀티클론 준비
            if (!window.GORI.pdCaptureDone) {
                window.GORI.pdCaptureDone = true;
                document.addEventListener('pointerdown', (e) => {
                    const altDown = e.altKey || e.getModifierState?.('Alt') || false;
                    if (!altDown) return;
                    // 이전 Alt+drag에서 남은 죽은 참조 정리 (Ctrl+Z 후에도 잔류)
                    window.GORI.altDragClones = null;
                    window.GORI.altDragLastPos = null;
                    if (!app?.canvas?.graph) return;
                    const c = app.canvas;
                    if (typeof c.adjustMouseEvent === 'function') c.adjustMouseEvent(e);
                    let cx = e.canvasX, cy = e.canvasY;
                    if (cx == null) {
                        const rect = c.canvas?.getBoundingClientRect?.();
                        if (rect) { cx = e.clientX - rect.left; cy = e.clientY - rect.top; }
                    }
                    const node = c.graph?.getNodeOnPos(cx, cy);
                    if (!node || !c.selected_nodes) return;
                    const isMap = c.selected_nodes instanceof Map;
                    // 죽은 참조 정리: selected_nodes에 있지만 graph에 없는 노드 제거
                    const graphNodes = c.graph._nodes || [];
                    const graphNodeIds = new Set();
                    graphNodes.forEach(n => { if (n.id != null) graphNodeIds.add(n.id); });
                    let removedCount = 0;
                    let beforeSize = 0;
                    if (isMap) {
                        beforeSize = c.selected_nodes.size;
                        const staleIds = [...c.selected_nodes.keys()].filter(id => id != null && !graphNodeIds.has(id));
                        staleIds.forEach(id => c.selected_nodes.delete(id));
                        removedCount = staleIds.length;
                    } else {
                        beforeSize = Object.keys(c.selected_nodes).length;
                        Object.keys(c.selected_nodes).forEach(id => {
                            if (!graphNodeIds.has(Number(id))) { delete c.selected_nodes[id]; removedCount++; }
                        });
                    }
                    if (removedCount > 0) {
                        console.log('🐛 selNodes cleanup:', removedCount, 'stale removed, before:', beforeSize, 'after:', isMap ? c.selected_nodes.size : Object.keys(c.selected_nodes).length,
                            'graphNodes:', graphNodes.map(n=>n.type+'['+n.id+']'));
                    }
                    const inSel = isMap ? c.selected_nodes.has(node.id) : !!c.selected_nodes[node.id];
                    if (!inSel) return;
                    const count = isMap ? c.selected_nodes.size : Object.keys(c.selected_nodes).length;
                    if (count < 2) return;
                    const entries = isMap ? [...c.selected_nodes.values()] : Object.values(c.selected_nodes);
                    const others = entries.filter(n => n && n.id != null && n.id !== node.id);
                    if (!others.length) return;

                    // 동기적으로 추가 클론 생성 → selected_nodes setter가 자동 주입
                    const clones = [];
                    others.forEach((n) => {
                        const cloned = n.clone();
                        if (cloned) {
                            // 원본과 동일 위치 (LiteGraph 클론도 동일 위치에 생성됨)
                            c.graph.add(cloned, false, {doCalcSize: false});
                            clones.push(cloned);
                        }
                    });
                    // 드래그 전체 구간 동안 __goriPDClones 유지 → selectNode() 호출 시마다 GoRi 클론 재주입
                    window.GORI.pdClones = clones;
                    // Alt+drag 클론 동기 이동을 위한 초기 위치 기록
                    window.GORI.altDragClones = clones;
                    window.GORI.altDragLastPos = [cx, cy];
                }, true);
            }

            // capture-phase pointermove: 추가 클론을 LiteGraph의 node_dragging과 함께 이동
            if (!window.GORI.pdMoveCaptureDone) {
                window.GORI.pdMoveCaptureDone = true;
                const ensureSelected = (clones, c) => {
                    if (!clones?.length || !c?.selected_nodes) return;
                    const isMap = c.selected_nodes instanceof Map;
                    for (const clone of clones) {
                        if (clone && clone.id != null) {
                            if (isMap) { if (!c.selected_nodes.has(clone.id)) c.selected_nodes.set(clone.id, clone); }
                            else { if (!c.selected_nodes[clone.id]) c.selected_nodes[clone.id] = clone; }
                        }
                    }
                };
                document.addEventListener('pointermove', (e) => {
                    const clones = window.GORI.altDragClones;
                    if (!clones?.length) return;
                    const c = app?.canvas;
                    if (!c) return;
                    if (typeof c.adjustMouseEvent === 'function') c.adjustMouseEvent(e);
                    let cx = e.canvasX, cy = e.canvasY;
                    if (cx == null) {
                        const rect = c.canvas?.getBoundingClientRect?.();
                        if (rect) { cx = e.clientX - rect.left; cy = e.clientY - rect.top; }
                    }
                    if (cx == null) return;
                    const last = window.GORI.altDragLastPos;
                    if (!last) return;
                    const dx = cx - last[0];
                    const dy = cy - last[1];
                    if (dx !== 0 || dy !== 0) {
                        for (const clone of clones) {
                            if (clone) {
                                clone.pos[0] += dx;
                                clone.pos[1] += dy;
                            }
                        }
                        window.GORI.altDragLastPos = [cx, cy];
                    }
                    // 매 프레임 GoRi 클론 선택 보장 (LiteGraph가 지워도 복원)
                    ensureSelected(clones, c);
                }, true);
                document.addEventListener('pointerup', () => {
                    // capture-phase: bubble(LiteGraph)보다 먼저 실행되므로
                    // 직접 selected_nodes에 GoRi 클론을 추가한 후 tick 뒤 정리
                    const clones = window.GORI.altDragClones;
                    const c = app?.canvas;
                    ensureSelected(clones, c);
                    window.GORI.altDragClones = null;
                    window.GORI.altDragLastPos = null;
                    setTimeout(() => {
                        window.GORI.pdClones = null;
                        // LiteGraph가 mouseup 등에서 다시 지웠을 수 있으니 한 번 더 복원
                        const canvas = app?.canvas;
                        if (canvas && clones?.length) ensureSelected(clones, canvas);
                    }, 0);
                }, true);
            }

            canvas.__goriPDMultiPatched = true;
            return true;
        };

        const ensureCanvasPatches = () => {
            const okClipboard = patchCanvasClipboardMethods();
            const okKey = patchProcessKey();
            const okGraph = patchLGraphAddMethods() || patchGraphAddMethods();
            const okAltDrag = patchAltDragMultiClone();
            const canvasInfo = app?.canvas ? 
                `ctor=${app.canvas.constructor?.name} pdPatched=${!!app.canvas.__goriPDMultiPatched}` 
                : 'no canvas';
            console.log(`🔄 GoRi 패치 시도: clipboard=${okClipboard} graph=${okGraph} altdrag=${okAltDrag} canvas=${canvasInfo}`);
            if (okClipboard && okGraph && okAltDrag) {
                if (!window.GORI.clipboardPatchReadyLogged) {
                    window.GORI.clipboardPatchReadyLogged = true;
                    console.log("✅ GoRi 복사/붙여넣기 훅 연결 완료");
                }
                return;
            }
            setTimeout(ensureCanvasPatches, 100);
        };
        ensureCanvasPatches();

        if (!window.GORI.pasteKeyListener) {
            window.GORI.pasteKeyListener = true;
            let last = 0;
            window.addEventListener("keydown", (e) => {
                if (e.target?.tagName === "INPUT" || e.target?.tagName === "TEXTAREA" || e.target?.isContentEditable) return;
                const key = (e?.key || "").toLowerCase();
                
                // Ctrl+D: 북마크 창 방지만 하고, GoRi 기능은 수행하지 않음
                if (e?.ctrlKey && (key === "d" || key === "D")) {
                    e.preventDefault();
                    console.log("✅ Ctrl+D 북마크 창 방지됨");
                    return;
                }
                
                if (!(e?.ctrlKey && !e?.shiftKey && (key === "v"))) return;
                const now = Date.now();
                if (now - last < 120) return;
                last = now;
                // 누산기가 정규화를 처리함
            }, true);
        }

        // 상시 감시 루프: 복사/붙여넣기 감지 실패 상황 커버 (Alt+drag 등) + CPU 최적화
        if (!window.GORI.receiverGuardLoopStarted) {
            const knownIds = new Set();
            const initNodes = app.graph?._nodes || [];
            initNodes.forEach((n) => { if (n.id != null) knownIds.add(n.id); });

            const hasGoriSignals = (node) => {
                if (!node || node.__gori_normalized) return false;
                const slots = [...(node.inputs || []), ...(node.outputs || [])];
                return slots.some((s) => !!(s?.gori_channel || s?.gori_active || s?.gori_auto_blocked)) || !!node?.__gori_cloned;
            };
            let guardFirstRun = true;
            const MAX_ACCUM_IDLE = 3;
            let pendingGoriNodes = new Set();
            let accumIdleFrames = 0;
            let guardFrameCount = 0;
            const guardLoop = () => {
                requestAnimationFrame(guardLoop);
                guardFrameCount++;

                const allNodes = app.graph?._nodes || [];
                if (!allNodes.length) return;

                // 엔진 OFF: 30프레임(0.5초)마다만 알림 ID 갱신, CPU 98% 절약
                if (!GORI_MENU.state.isActive) {
                    if (guardFrameCount % 30 !== 0) return;
                    if (!guardFirstRun) {
                        const currentIds = new Set();
                        allNodes.forEach((n) => { if (n.id != null) currentIds.add(n.id); });
                        knownIds.clear();
                        currentIds.forEach((id) => knownIds.add(id));
                    }
                    return;
                }

                if (guardFirstRun && allNodes.length > 0) {
                    knownIds.clear();
                    allNodes.forEach((n) => { if (n.id != null) knownIds.add(n.id); });
                    guardFirstRun = false;
                    enforceReceiverBlockFromDisabledSenders();
                    return;
                }

                const currentIds = new Set();
                allNodes.forEach((n) => { if (n.id != null) currentIds.add(n.id); });
                const commonCount = [...knownIds].filter((id) => currentIds.has(id)).length;
                const isWorkflowReplaced = knownIds.size > 0 && commonCount < knownIds.size * 0.3;

                if (isWorkflowReplaced) {
                    pendingGoriNodes.clear();
                    accumIdleFrames = 0;
                    knownIds.clear();
                    currentIds.forEach((id) => knownIds.add(id));
                } else {
                    const newNodes = allNodes.filter((n) => n.id != null && !knownIds.has(n.id));
                    const goriNewNodes = newNodes.filter(hasGoriSignals);

                    if (goriNewNodes.length > 0) {
                        console.log(`🔍 GoRi 감시: 새 노드 ${newNodes.length}개 (gori: ${goriNewNodes.length}개)`, 
                            newNodes.map(n => `${n.type}[${n.id}] gori=${hasGoriSignals(n)}`));
                        console.log(`🔍 GoRi 선택 노드:`, 
                            getSelectedValues(app.canvas?.selected_nodes).map(n => `${n.type}[${n.id}]`));
                    }

                    if (goriNewNodes.length > 0) {
                        goriNewNodes.forEach((n) => pendingGoriNodes.add(n));
                        accumIdleFrames = 0;
                        if (pendingGoriNodes.size === 1) {
                            const batch = [...pendingGoriNodes].filter(
                                (n) => n.id != null && allNodes.includes(n)
                            );
                            pendingGoriNodes.clear();
                            if (batch.length > 0) {
                                const beforeGraphNodes = allNodes.filter((n) => !batch.includes(n));
                                normalizePastedNodes(batch, { beforeGraphNodes });
                            }
                        }
                    } else if (pendingGoriNodes.size > 0) {
                        accumIdleFrames++;
                        if (accumIdleFrames >= MAX_ACCUM_IDLE) {
                            accumIdleFrames = 0;
                            const batch = [...pendingGoriNodes].filter(
                                (n) => n.id != null && allNodes.includes(n)
                            );
                            pendingGoriNodes.clear();
                            if (batch.length > 0) {
                                console.log(`🔄 GoRi 누산기 플러시: ${batch.length}개 노드 일괄 정규화 (${batch.map(n => `${n.type}[${n.id}]`).join(', ')})`);
                                const beforeGraphNodes = allNodes.filter((n) => !batch.includes(n));
                                normalizePastedNodes(batch, { beforeGraphNodes });
                            }
                        }
                    }

                    knownIds.clear();
                    currentIds.forEach((id) => knownIds.add(id));
                }

                // 차단 검사: 5프레임(약 0.08초)마다 실행 (CPU 부하 80% 감소)
                if (guardFrameCount % 5 === 0) {
                    enforceReceiverBlockFromDisabledSenders();
                }
            };
            window.GORI.receiverGuardLoopStarted = true;
            guardLoop();
        }

        // 5. 마우스 우클릭 (채널 이름 수동 설정)
        if (!LGraphCanvas.prototype.__goriContextMenuPatched) {
            const originalContextMenu = LGraphCanvas.prototype.processContextMenu;
            LGraphCanvas.prototype.processContextMenu = function(node, e) {
                if (node) {
                    const mX = this.graph_mouse[0];
                    const mY = this.graph_mouse[1];
                    const check = (slots, isInput) => {
                        if (!slots) return false;
                        for (let i = 0; i < slots.length; i++) {
                            const sPos = GORI_RENDERER.getSwitchPos(node, slots[i], isInput, i);
                            if (Math.sqrt((mX - sPos.x) ** 2 + (mY - sPos.y) ** 2) < 15) {
                                const oldVal = slots[i].gori_channel || "";
                                const newVal = prompt("📡 고리 엔진 - 채널 이름 설정:", oldVal);
                                if (newVal !== null) {
                                    slots[i].gori_channel = newVal.trim();
                                    if (slots[i].gori_channel !== "") slots[i].gori_active = true;
                                    node.setDirtyCanvas(true, true);
                                    if (node.graph) node.graph._version++;
                                }
                                return true;
                            }
                        }
                        return false;
                    };
                    if (check(node.inputs, true) || check(node.outputs, false)) return;
                }
                return originalContextMenu.apply(this, arguments);
            };
            LGraphCanvas.prototype.__goriContextMenuPatched = true;
        }
// 6. 단축키 시스템 (G / S / Shift+S)
        // 캡처 단계(true) 사용: Load Image INPUT 등이 ESC를 가로채는 것 방지
        window.addEventListener('keydown', (e) => {
            // Load Image INPUT 등 하위 요소가 ESC를 가로채도 우리가 먼저 처리
            const key = e.key.toLowerCase();

            // [ESC] - INPUT 등에 포커스가 있어도 항상 동작 (Load Image 노드 대응)
            if (key === 'escape') {
                const popup = document.getElementById("gori-popup-container");
                if (popup) {
                    console.log("close GoRi Popup (ESC)");
                    popup.remove();
                    e.preventDefault();
                }
                // 다중 선택 완전 초기화 (ComfyUI 내부 상태까지 직접 정리)
                const canvas = app.canvas;
                const graph = app.graph;
                if (canvas) {
                    // 0. 네이티브 deselectAllNodes 먼저 호출
                    if (typeof canvas.deselectAllNodes === 'function') {
                        canvas.deselectAllNodes();
                    }
                    // 1. 모든 노드 is_selected 플래그 제거
                    graph?._nodes?.forEach(n => { n.is_selected = false; });
                    // 2. selected_nodes 완전 비우기 (Map/객체 모두)
                    if (canvas.selected_nodes) {
                        const sel = canvas.selected_nodes;
                        const keys = sel instanceof Map ? [...sel.keys()] : Object.keys(sel);
                        keys.forEach(k => {
                            if (sel instanceof Map) sel.delete(k);
                            else delete sel[k];
                        });
                    }
                    // 3. _selected_nodes 직접 정리 (내부 저장소)
                    if (canvas._selected_nodes) {
                        if (canvas._selected_nodes instanceof Map) canvas._selected_nodes.clear();
                        else canvas._selected_nodes = {};
                    }
                    // 4. 마우스 호버 + 드래그 상태 초기화 (연결선 재등장 방지)
                    canvas.node_over = null;
                    canvas.node_dragging = null;
                    // 5. 캔버스 완전 갱신
                    canvas.setDirty(true, true);
                    if (graph) graph.change();
                }
                return;
            }

            // INPUT/TEXTAREA에 포커스 있으면 나머지 단축키 무시 (ESC는 위에서 이미 처리됨)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
            const nodes = app.graph._nodes;
            if (!nodes) return;

            if (!GORI_MENU.state.isActive) return;

            // [G] - 하이브리드 지능형 청소
            if (key === 'g' && !e.shiftKey) {
                e.preventDefault();
                const selectedNodes = Object.values(app.canvas.selected_nodes || {});

                if (selectedNodes.length > 0) {
                    console.log(`🧹 GoRi: 선택된 ${selectedNodes.length}개 노드 공장 초기화.`);
                    selectedNodes.forEach(n => {
                        [...(n.inputs || []), ...(n.outputs || [])].forEach(slot => {
                            slot.gori_channel = ""; 
                            slot.gori_active = false; 
                        });
                        if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
                    });
                } else {
                    console.log("🧹 GoRi: 전체 유령 신호 및 비활성 슬롯 정밀 청소.");
                    const activeOuts = new Set();
                    const activeIns = new Set();
                    
                    nodes.forEach(n => {
                        n.outputs?.forEach(s => { if(s.gori_active && s.gori_channel) activeOuts.add(s.gori_channel); });
                        n.inputs?.forEach(s => { if(s.gori_active && s.gori_channel) activeIns.add(s.gori_channel); });
                    });

                    nodes.forEach(n => {
                        [...(n.inputs || []), ...(n.outputs || [])].forEach(slot => {
                            const isInput = n.inputs?.includes(slot);
                            const hasPartner = isInput ? activeOuts.has(slot.gori_channel) : activeIns.has(slot.gori_channel);
                            
                            if (!slot.gori_active || !hasPartner) {
                                slot.gori_channel = "";
                                slot.gori_active = false;
                            }
                        });
                        if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
                    });
                }
                app.canvas.setDirty(true, true);
            }

            // [S] - 시각적 인덱스 리셋 + 채널 동기화(리채널링)
            if (key === 's' && !e.shiftKey) {
                e.preventDefault();
                console.log("📡 GoRi Engine: Scan & Re-indexing Triggered.");

                GORI_CORE.updateVisualIndices();

                const sortedNodes = [...nodes].sort((a, b) => {
                    if (Math.abs(a.pos[1] - b.pos[1]) > 50) return a.pos[1] - b.pos[1];
                    return a.pos[0] - b.pos[0];
                });

                let counter = 1;
                const channelMap = new Map();
                const activeInputCountByChannel = new Map();
                const activeOutputCountByChannel = new Map();

                const inc = (map, key) => map.set(key, (map.get(key) || 0) + 1);

                nodes.forEach((n) => {
                    n.inputs?.forEach((slot) => {
                        if (slot.gori_channel && slot.gori_active && !slot.gori_auto_blocked) {
                            inc(activeInputCountByChannel, slot.gori_channel);
                        }
                    });
                    n.outputs?.forEach((slot) => {
                        if (slot.gori_channel && slot.gori_active) {
                            inc(activeOutputCountByChannel, slot.gori_channel);
                        }
                    });
                });

                // 활성 송/수신이 모두 있는 채널만 리채널링 대상
                const channelsToRename = new Set();
                activeOutputCountByChannel.forEach((_, channel) => {
                    if ((activeInputCountByChannel.get(channel) || 0) > 0) {
                        channelsToRename.add(channel);
                    }
                });

                // 이번 S에서 이름을 바꾸지 않는 채널명은 "예약" 처리해 충돌 재사용 방지
                const reservedNames = new Set();
                nodes.forEach((n) => {
                    [...(n.inputs || []), ...(n.outputs || [])].forEach((slot) => {
                        if (slot.gori_channel && !channelsToRename.has(slot.gori_channel)) {
                            reservedNames.add(slot.gori_channel);
                        }
                    });
                });

                sortedNodes.forEach((n) => {
                    n.outputs?.forEach((slot) => {
                        if (slot.gori_channel && channelsToRename.has(slot.gori_channel) && !channelMap.has(slot.gori_channel)) {
                            let newName = `CH_${String(counter).padStart(3, '0')}`;
                            while (reservedNames.has(newName) || [...channelMap.values()].includes(newName)) {
                                counter++;
                                newName = `CH_${String(counter).padStart(3, '0')}`;
                            }
                            channelMap.set(slot.gori_channel, newName);
                            counter++;
                        }
                    });
                });

                // 중요: 채널 단위로 전체 슬롯에 동일 적용 (활성/비활성 섞여도 쌍이 안 갈라지게)
                nodes.forEach((n) => {
                    n.inputs?.forEach((slot) => {
                        if (channelMap.has(slot.gori_channel)) {
                            slot.gori_channel = channelMap.get(slot.gori_channel);
                        }
                    });
                    n.outputs?.forEach((slot) => {
                        if (channelMap.has(slot.gori_channel)) {
                            slot.gori_channel = channelMap.get(slot.gori_channel);
                        }
                    });
                });

                app.canvas.setDirty(true, true);
                console.log("✅ GoRi Engine: Visual Indexing & Sync Complete.");
            }

            // [Shift + S] - 슈퍼 어셈블러
            if (key === 's' && e.shiftKey) {
                e.preventDefault();
                console.log("⚡ GoRi Engine: Super Assembler 가동.");

                GORI_CORE.updateVisualIndices();

                if (GORI_CORE.convertWiresToGori) {
                    GORI_CORE.convertWiresToGori(nodes);
                }

                if (GORI_CORE.autoConnectByTypes) {
                    GORI_CORE.autoConnectByTypes(nodes);
                }

                app.canvas.setDirty(true, true);
                console.log("⚡ GoRi Engine: Super Assembly Complete.");
            }
        }, true);
    }
});
