# apps/ai-services — CV / ML Inference Containers

Packaged model-serving pipeline for computer-vision operations:
- Detection: YOLOv8 (GPU/CPU) + deterministic SimulatedPersonDetector
- Tracking: ByteTrack-style two-stage IoU association (`services.tracking.iou_tracker`)
- Re-ID: OSNet + Cosine appearance vectors (`services.reid`)
- Product Recognition: Histogram/CLIP embeddings + barcode/OCR hooks (`services.product`)

## Running Inference:

```bash
python -m apps.ai_services.service --camera CAM-01 --source simulation
```
