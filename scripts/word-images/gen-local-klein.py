#!/usr/bin/env python3
"""
用本機的 FLUX.2 klein 4B（mflux，Apple MLX）替單字產生「意思插圖」。

用法（mflux 裝在獨立的虛擬環境）：
  ~/WorkSpace/tools/mflux-venv/bin/python scripts/word-images/gen-local-klein.py <輸出資料夾> [單字數上限]

- 畫面描述讀 scripts/word-images/prompts-toeic.json（單字 → 英文場景描述）
- 模型只載入一次，之後每張圖重複使用，比每張呼叫一次 mflux-generate-flux2 快很多
- 每張存成 <輸出資料夾>/<單字>.jpg；已存在就略過，中斷後重跑會接續
- 模型權重來自 Hugging Face 官方 repo black-forest-labs/FLUX.2-klein-4B（Apache 2.0）
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from mflux.models.common.config.model_config import AVAILABLE_MODELS
from mflux.models.common.resolution.config_resolution import ConfigResolution
from mflux.models.flux2.variants import Flux2Klein

MODEL_NAME = "flux2-klein-4b"
# klein 是蒸餾模型：4 步就夠，guidance 必須是 1.0
STEPS = 4
GUIDANCE = 1.0
SIZE_PX = 512
# 固定種子：同一個描述每次產生同一張圖，方便重跑比較
SEED = 42
JPEG_QUALITY = 80
# 統一畫風：和 gen-cloudflare.mjs 相同，換模型時畫面描述不用改
STYLE = (
    "flat vector illustration, friendly cartoon style, bright clear colors, simple clean shapes, "
    "plain white background, centered, no text, no letters, no words, any signs, papers or screens are blank"
)


def file_name_of(word: str) -> str:
    """檔名規則要和 gen-cloudflare.mjs、apply-word-pictures.mjs 一致"""
    return "-".join(word.strip().lower().replace("/", " ").split()) + ".jpg"


def main() -> int:
    if len(sys.argv) < 2:
        print("用法：gen-local-klein.py <輸出資料夾> [單字數上限]")
        return 1
    out_dir = Path(sys.argv[1]).expanduser()
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
    out_dir.mkdir(parents=True, exist_ok=True)

    prompts = json.loads((Path(__file__).parent / "prompts-toeic.json").read_text(encoding="utf-8"))
    entries = list(prompts.items())[:limit]
    todo = [(w, s) for w, s in entries if not (out_dir / file_name_of(w)).exists()]
    print(f"共 {len(entries)} 字，要產生 {len(todo)} 張，略過 {len(entries) - len(todo)} 張", flush=True)
    if not todo:
        return 0

    family = tuple(k for k in AVAILABLE_MODELS if k.startswith("flux2-") and k != MODEL_NAME)
    config = ConfigResolution.resolve_restricted(MODEL_NAME, MODEL_NAME, model_path=None, extra_keys=family, base_model=None)
    model = Flux2Klein(model_config=config, quantize=None, model_path=None)

    # 防重複：輸出資料夾裡每張圖的內容雜湊。新圖和任何一張相同就立刻停下，
    # 不會再像 2026-11-25 那樣跑完 1,636 張才發現全部一樣
    def digest(path: Path) -> str:
        return hashlib.md5(path.read_bytes()).hexdigest()

    seen = {digest(p): p.name for p in out_dir.glob("*.jpg")}
    failed = []
    started = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        for i, (word, scene) in enumerate(todo, 1):
            target = out_dir / file_name_of(word)
            # 每張用不同的暫存檔名：mflux 存圖預設不覆蓋（overwrite=False），
            # 同名檔已存在時會改存成別的檔名，共用一個檔名會讓每張都轉成第一張圖
            png = Path(tmp) / f"{i}.png"
            try:
                image = model.generate_image(
                    seed=SEED,
                    prompt=f"{scene}. {STYLE}",
                    width=SIZE_PX,
                    height=SIZE_PX,
                    guidance=GUIDANCE,
                    num_inference_steps=STEPS,
                    scheduler="flow_match_euler_discrete",
                )
                image.save(path=str(png), export_json_metadata=False)
                # 轉成 JPEG 才小（PNG 約 400 KB，JPEG 約 40 KB）
                subprocess.run(
                    ["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(JPEG_QUALITY), str(png), "--out", str(target)],
                    check=True,
                    capture_output=True,
                )
                png.unlink()
                new_hash = digest(target)
                if new_hash in seen:
                    target.unlink()
                    print(f"✗ {word} 的圖和 {seen[new_hash]} 完全相同，腳本有問題，停止產圖", flush=True)
                    return 3
                seen[new_hash] = target.name
                elapsed = time.time() - started
                print(f"✓ {i}/{len(todo)} {word}（平均每張 {elapsed / i:.1f} 秒）", flush=True)
            except Exception as e:  # 單張失敗不中斷整批
                failed.append(word)
                print(f"✗ {word}：{e}", flush=True)

    print(f"完成：產生 {len(todo) - len(failed)}，失敗 {len(failed)}{'（' + ', '.join(failed) + '）' if failed else ''}", flush=True)
    return 2 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
