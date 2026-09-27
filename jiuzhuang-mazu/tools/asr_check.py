"""QA: transcribe every narration wav with an offline ASR model and print next to the script."""
import json, sherpa_onnx, soundfile as sf, os
D = os.environ.get("ASR_DIR", "/tmp/claude-0/-home-user-insurance-signal-review-p01/209ba1a0-5e5b-51b7-b14f-a021e3bef3cf/scratchpad/tts/sherpa-onnx-paraformer-zh-small-2024-03-09")
r = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=f"{D}/model.int8.onnx", tokens=f"{D}/tokens.txt", num_threads=4)
tl = json.load(open("build/timeline.json"))
for sc in tl["scenes"]:
    for l in sc["lines"]:
        x, sr = sf.read(l["wav"], dtype="float32"); s = r.create_stream(); s.accept_waveform(sr, x); r.decode_stream(s)
        print(f'{l["n"]:02d} 稿:{l["zh"]}\n   聽:{s.result.text}')
