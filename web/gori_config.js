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
 * [Part 1] gori_config.js
 * 역할: 중복 기능 노드(Set/Get, Anything Everywhere) 차단
 */

// GORI 전역 상태 저장소 - window 오염 방지 (단 하나의 window 변수만 사용)
window.GORI = window.GORI || {};

export const GORI_CONFIG = {
    // 1. 제외할 노드 명칭 리스트
    EXCLUDED_EXACT: [
        "GetNode", 
        "SetNode", 
        "Reroute", 
        "ReroutePrimitive",
        // Anything Everywhere 시리즈 추가
        "Anything Everywhere",
        "Anything Everywhere?",
        "Anything Everywhere3",
        "Seed Everywhere",
        "Prompts Everywhere"
    ],

    isExcluded: function(nodeData) {
        if (!nodeData) return false;

        const type = (nodeData.type || "").toString();
        const name = (nodeData.name || "").toString();
        
        // 2. 정확한 이름 매칭으로 차단
        if (this.EXCLUDED_EXACT.includes(type) || this.EXCLUDED_EXACT.includes(name)) {
            return true;
        }

        // 3. 키워드 매칭 (혹시 모를 변종 Anything Everywhere 노드들까지 방어)
        if (type.includes("Everywhere") || name.includes("Everywhere")) {
            return true;
        }

        return false; // 나머지는 활짝 개방!
    }
};