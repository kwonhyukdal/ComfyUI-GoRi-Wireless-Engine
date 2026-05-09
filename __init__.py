import os
import json
from aiohttp import web
from server import PromptServer
from .core_scanner import GoRiScanner

# [경로 설정]
current_dir = os.path.dirname(os.path.realpath(__file__))
BASE_PATH = os.path.dirname(current_dir)
MAP_FILE = os.path.join(current_dir, "gori_map.json")

# [색상 매칭 테이블] - UI 스캔의 핵심
TYPE_COLORS = {
    "MODEL": "#b5a2ff",
    "CLIP": "#ffff99",
    "VAE": "#ff5555",
    "CONDITIONING": "#ffcc66",
    "IMAGE": "#66ff66",
    "LATENT": "#ff9933",
    "MASK": "#6666ff",
    "CONTROL_NET": "#00ffcc",
    "PIPE_LINE": "#ffffff",
    "CONTROL_NET_STACK": "#ffffff",
    "LORA_STACK": "#ffffff",
    "BASIC_PIPE": "#ffffff",
    "STRING": "#ffffff",
    "INT": "#ffffff",
    "FLOAT": "#ffffff",
    "BOOLEAN": "#ffffff",
    "NUMBER": "#ffffff",
    "VEC2": "#ffffff",
    "VEC3": "#ffffff",
    "VEC4": "#ffffff",
    "IPADAPTER": "#ffffff",
    "EMBEDS": "#ffffff",
    "CLIP_VISION": "#ffffff",
    "IPADAPTER_PARAMS": "#ffffff"
}

def run_gori_scan():
    """노드 정보와 UI 색상을 매칭하여 전수 조사"""
    print("🌈 [GoRi] 전수 조사 및 UI 스캔 가동...")
    scanner = GoRiScanner(BASE_PATH)
    scanner.scan_now() # 기본 스캔 실행
    
    # 생성된 json에 UI 색상 정보를 입히는 작업
    if os.path.exists(MAP_FILE):
        with open(MAP_FILE, "r", encoding="utf-8") as f:
            db = json.load(f)
        
        # 각 노드 정보에 색상 규격 추가
        for node_name, types in db.items():
            db[node_name] = {
                "types": types,
                "colors": [TYPE_COLORS.get(t, "#ffffff") for t in types]
            }
            
        with open(MAP_FILE, "w", encoding="utf-8") as f:
            json.dump(db, f, indent=4)
    print("✅ [GoRi] UI 및 신호 스캔 완료!")

# JS에서 호출할 때마다 재스캔하는 API
@PromptServer.instance.routes.get("/gori/map")
async def get_gori_map(request):
    run_gori_scan() 
    
    if os.path.exists(MAP_FILE):
        with open(MAP_FILE, "r", encoding="utf-8") as f:
            return web.json_response(json.load(f))
    return web.json_response({"error": "scan_failed"}, status=500)

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']