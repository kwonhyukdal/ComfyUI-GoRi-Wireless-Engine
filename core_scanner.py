import os
import ast
import json

class GoRiScanner:
    def __init__(self, custom_nodes_path):
        self.base_path = custom_nodes_path
        self.mapping_file = os.path.join(os.path.dirname(__file__), "gori_map.json")
        self.wireless_db = {} # { "NodeName": ["MODEL", "IMAGE"], ... }

    def scan_now(self):
        print("🌈 [GoRi] 풀 컬러 스캔 모드 가동: 모든 데이터 타입을 수집합니다...")
        for root, dirs, files in os.walk(self.base_path):
            if "ComfyUI-GoRi" in root: continue 
            for file in files:
                if file.endswith(".py"):
                    self._extract_node_info(os.path.join(root, file))

        with open(self.mapping_file, "w", encoding="utf-8") as f:
            json.dump(self.wireless_db, f, indent=4)
        
        # 어떤 타입들이 발견됐는지 요약 보고!
        all_types = set()
        for types in self.wireless_db.values():
            all_types.update(types)
            
        print(f"✅ [GoRi] 전수조사 완료! 총 {len(all_types)}종류의 신호 타입을 발견했습니다.")
        print(f"📡 발견된 주요 주파수: {list(all_types)[:10]} ...")

    @staticmethod
    def _resolve_ast_type(node):
        if isinstance(node, ast.Str):
            return node.s
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            parts = []
            cur = node
            while isinstance(cur, ast.Attribute):
                parts.append(cur.attr)
                cur = cur.value
            if isinstance(cur, ast.Name):
                parts.append(cur.id)
            return ".".join(reversed(parts))
        if isinstance(node, ast.Starred):
            return GoRiScanner._resolve_ast_type(node.value)
        if isinstance(node, ast.Constant):
            return str(node.value)
        if isinstance(node, ast.Subscript):
            value = GoRiScanner._resolve_ast_type(node.value) or "?"
            if hasattr(node, 'slice'):
                s = node.slice
                if isinstance(s, ast.Index):
                    s = s.value
                slice_str = GoRiScanner._resolve_ast_type(s) or "?"
            else:
                slice_str = "?"
            return f"{value}[{slice_str}]"
        if isinstance(node, ast.Call):
            func = GoRiScanner._resolve_ast_type(node.func) or "?"
            return f"{func}(...)"
        if isinstance(node, (ast.Tuple, ast.List)):
            parts = [GoRiScanner._resolve_ast_type(e) for e in node.elts]
            parts = [p for p in parts if p]
            return ", ".join(parts) if parts else None
        return None

    def _extract_node_info(self, file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                node_tree = ast.parse(f.read())
            for node in ast.walk(node_tree):
                if isinstance(node, ast.ClassDef):
                    for item in node.body:
                        if isinstance(item, ast.Assign) and \
                           isinstance(item.targets[0], ast.Name) and \
                           item.targets[0].id == "RETURN_TYPES":
                            
                            if isinstance(item.value, (ast.Tuple, ast.List)):
                                types = []
                                for t in item.value.elts:
                                    resolved = GoRiScanner._resolve_ast_type(t)
                                    if resolved is not None:
                                        types.append(resolved)
                                if types:
                                    self.wireless_db[node.name] = types
        except Exception as e:
            print(f"⚠️ [GoRi] 스캔 오류: {os.path.basename(file_path)} - {e}")