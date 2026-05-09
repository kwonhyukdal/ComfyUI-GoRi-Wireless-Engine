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
 * [Part 2] gori_render.js
 * 역할: 스위치 위치 계산, 베지어 곡선 렌더링 및 시각적 인덱스(#001) 배지 표시
 * 수정 사항: 직접 수치 조절이 가능하도록 상세 한글 주석 및 가이드 추가
 */

import { GORI_MENU } from "./gori_menu.js";

export const GORI_RENDERER = {
    // 노드 우측 상단에 고리 인덱스 배지를 그리는 함수
    drawIndexBadge: function(ctx, node) {
        if (!node.gori_index || node.flags.collapsed) return;

        const indexText = `GR-${String(node.gori_index).padStart(3, '0')}`;
        
        ctx.save();
        
        // --- [수치 조절 가이드 영역] ---
        
        // 1. 폰트 크기 및 스타일
        ctx.font = "bold 14px sans-serif";
        const textWidth = ctx.measureText(indexText).width;
        
        // 2. 배지 상자의 크기 (Width: 가로, Height: 세로)
        const badgeWidth = textWidth + 10;  // 10: 좌우 패딩 합계
        const badgeHeight = 21;             // 💡 조절: 이 값을 키우면 하단 여백이 늘어납니다 (현재 이미지 반영 값)
        
        // 3. 배지의 전체 위치 (X: 가로 좌표, Y: 세로 좌표)
        const posX = node.size[0] - badgeWidth - 5; // 5: 오른쪽 끝에서의 이격 거리
        const posY = -LiteGraph.NODE_TITLE_HEIGHT + 4.5; // 💡 조절: 4.5를 줄이면 위로, 키우면 아래로 이동합니다

        // ------------------------------

        // 1. 배지 배경 (반투명 블랙)
        ctx.beginPath();
        this.roundRect(ctx, posX, posY, badgeWidth, badgeHeight, 3);
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fill();

        // 2. 네온 테두리 설정
        ctx.strokeStyle = "#00ff88"; 
        ctx.lineWidth = 0.8; // 💡 조절: 테두리 두께 (현재 0.8로 날렵하게 설정됨)
        ctx.stroke();

        // 3. 인덱스 텍스트 그리기 및 수직 중앙 정렬
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // 수직 정렬의 기준을 '중앙'으로 설정
        
        // 💡 조절: 마지막의 '+ 0.5'는 폰트 특성에 따른 미세 수직 위치 보정값입니다.
        // 글자가 미세하게 위로 치우치면 값을 키우고, 아래로 치우치면 값을 줄이세요.
        ctx.fillText(indexText, posX + badgeWidth/2, posY + (badgeHeight/2) - 0.6);

        ctx.restore();
    },

    // 라운드 사각형 헬퍼 함수
    roundRect: function(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    },

    // 스위치 버튼의 위치를 계산하는 함수
    getSwitchPos: function(node, slot, isInput, index) {
        const slotPos = node.getConnectionPos(isInput, index);
        const label = slot.label || slot.name || "";
        
        const tempCtx = document.createElement('canvas').getContext('2d');
        tempCtx.font = "bold 12px Arial";
        const tw = tempCtx.measureText(label).width || 35;
        
        const sx = isInput ? 15 + tw + 15 : node.size[0] - 15 - tw - 15;
        return { 
            x: node.pos[0] + sx, 
            y: slotPos[1], 
            localX: sx, 
            localY: slotPos[1] - node.pos[1] 
        };
    },
// 실제 선과 버튼을 그리는 함수
    drawVisuals: function(ctx, node, app) {
        if (!node.size || node.flags.collapsed) return;

        // 인덱스 배지 표시 토글 상태일 때만 표시
        if (GORI_MENU.state.showIndexBadge) {
            this.drawIndexBadge(ctx, node);
        }

        const isMainNode = app.canvas.node_over === node || !!app.canvas.selected_nodes[node.id];

        const drawGroup = (slots, isInput) => {
            if (!slots) return;
            slots.forEach((slot, i) => {
                if (isInput && slot.widget) return;
                
                const sPos = this.getSwitchPos(node, slot, isInput, i);
                const slotColor = slot.color || LGraphCanvas.link_type_colors[slot.type] || (isInput ? "#ffff00" : "#00ff00");

                // 엔진 활성 상태일 때만 연결선 렌더링
                if (slot.gori_active && slot.gori_channel && GORI_MENU.state.isActive) {
                    this.drawConnections(ctx, node, slot, isInput, i, slotColor, isMainNode, app);
                }

                if (slot.gori_channel) {
                    ctx.save();
                    // 채널 텍스트의 투명도 조절: 활성 상태일 때 더 선명하게
                    ctx.fillStyle = slot.gori_active ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)";
                    ctx.font = "italic 10px Arial";
                    const textWidth = ctx.measureText(slot.gori_channel).width;
                    const textX = isInput ? sPos.localX + 12 : sPos.localX - textWidth - 12;
                    ctx.fillText(slot.gori_channel, textX, sPos.localY + 3);
                    ctx.restore();
                }

                // 스위치 포인트(원) 그리기
                ctx.beginPath();
                ctx.arc(sPos.localX, sPos.localY, 5, 0, Math.PI * 2);
                if (slot.gori_active) {
                    ctx.fillStyle = slotColor;
                } else {
                    ctx.strokeStyle = "rgba(255,255,255,0.4)";
                    ctx.stroke();
                    ctx.fillStyle = "#000";
                }
                ctx.fill();
            });
        };

        drawGroup(node.inputs, true);
        drawGroup(node.outputs, false);
    },

    // 연결선(베지어 곡선) 상세 로직
    drawConnections: function(ctx, node, slot, isInput, i, slotColor, isMainNode, app) {
        let partners = [];
        app.graph._nodes.forEach(n => {
            if (node === n) return;
            const ts = isInput ? n.outputs : n.inputs;
            ts?.forEach((t, ti) => {
                if (t.gori_active && t.gori_channel === slot.gori_channel) {
                    partners.push(n.getConnectionPos(!isInput, ti));
                }
            });
        });

        if (partners.length > 0) {
            const rs = node.getConnectionPos(isInput, i);
            
            // 소켓 부분에 강조 점 그리기
            ctx.save();
            ctx.beginPath();
            ctx.arc(rs[0]-node.pos[0], rs[1]-node.pos[1], 6, 0, Math.PI*2);
            ctx.fillStyle = slotColor; 
            ctx.globalAlpha = 0.8; 
            ctx.fill();
            ctx.restore();

            // 선택된 노드일 때만 베지어 곡선 연결선 표시
            if (isMainNode) {
                partners.forEach(p => {
                    ctx.save();
                    const x1 = rs[0]-node.pos[0], y1 = rs[1]-node.pos[1];
                    const x2 = p[0]-node.pos[0], y2 = p[1]-node.pos[1];
                    const cp = Math.min(Math.abs(x2-x1)*0.5, 150);
                    
                    ctx.beginPath(); 
                    ctx.lineWidth = 3; 
                    ctx.strokeStyle = slotColor; 
                    ctx.globalAlpha = 0.5; 
                    
                    ctx.moveTo(x1, y1);
                    ctx.bezierCurveTo(
                        x1 + (isInput ? -cp : cp), y1, 
                        x2 + (isInput ? cp : -cp), y2, 
                        x2, y2
                    );
                    ctx.stroke(); 
                    ctx.restore();
                });
            }
        }
    }
};