import sherpa_onnx, os
M = os.environ.get("KOKORO_DIR", "/tmp/claude-0/-home-user-insurance-signal-review-p01/209ba1a0-5e5b-51b7-b14f-a021e3bef3cf/scratchpad/tts/kokoro-multi-lang-v1_1")
def make_tts():
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=f"{M}/model.onnx", voices=f"{M}/voices.bin", tokens=f"{M}/tokens.txt",
                data_dir=f"{M}/espeak-ng-data", dict_dir=f"{M}/dict",
                lexicon=f"{M}/lexicon-us-en.txt,{M}/lexicon-zh.txt"),
            num_threads=4),
        rule_fsts=f"{M}/date-zh.fst,{M}/phone-zh.fst,{M}/number-zh.fst", max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)
