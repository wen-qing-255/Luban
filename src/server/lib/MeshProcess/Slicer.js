import { Polygon, Polygons } from './Polygons';
import { Vector2 } from '../math/Vector2';

const LARGEST_NEGLECTED_GAP_FIRST_PHASE = 0.01;

class SlicerLayer {
    slicerSegments = [];

    faceIdxToSegmentIdx = new Map();

    z = -1;

    polygons = new Polygons();

    openPolygons = new Polygons();

    makePolygons() {
        this.makeBasicPolygonLoop();

        // this.polygons.simplify(meshfixMaximumResolution, meshfixMaximumDeviation);

        this.polygons.removeDegenerateVerts();
    }

    makeBasicPolygonLoop() {
        for (let startSegmentIdx = 0; startSegmentIdx < this.slicerSegments.length; startSegmentIdx++) {
            const slicerSegment = this.slicerSegments[startSegmentIdx];
            if (!slicerSegment.addedToPolygon) {
                this.makeBasicPolygon(startSegmentIdx);
            }
        }
    }

    makeBasicPolygon(startSegmentIdx) {
        const polygon = new Polygon();
        polygon.add(this.slicerSegments[startSegmentIdx].start);

        for (let segmentIdx = startSegmentIdx; segmentIdx !== -1;) {
            const slicerSegment = this.slicerSegments[segmentIdx];

            polygon.path.push(slicerSegment.end);
            slicerSegment.addedToPolygon = true;

            segmentIdx = this.getNextSegmentIdx(slicerSegment, startSegmentIdx);

            if (segmentIdx === startSegmentIdx) {
                this.polygons.add(polygon);
                return;
            }
        }

        // This is openPolygons
        this.polygons.add(polygon);
    }

    getNextSegmentIdx(slicerSegment, startSegmentIdx) {
        let nextSegmentIdx = -1;
        const segmentEndedAtEdge = slicerSegment.endVertex;

        if (!segmentEndedAtEdge) {
            const faceToTry = slicerSegment.endOtherFaceIdx;
            if (faceToTry === undefined) {
                return -1;
            }
            return this.tryFaceNextSegmentIdx(slicerSegment, faceToTry, startSegmentIdx);
        } else {
            for (const connectedFace of segmentEndedAtEdge.connectedFaces) {
                const resultSegmentIdx = this.tryFaceNextSegmentIdx(slicerSegment, connectedFace, startSegmentIdx);
                if (resultSegmentIdx === startSegmentIdx) {
                    return startSegmentIdx;
                } else if (resultSegmentIdx !== -1) {
                    nextSegmentIdx = resultSegmentIdx;
                }
            }
        }

        return nextSegmentIdx;
    }

    tryFaceNextSegmentIdx(slicerSegment, faceIdx, startSegmentIdx) {
        if (!this.faceIdxToSegmentIdx.has(faceIdx)) {
            return -1;
        }
        const segmentIdx = this.faceIdxToSegmentIdx.get(faceIdx);
        const p1 = this.slicerSegments[segmentIdx].start;
        const diff = Vector2.sub(slicerSegment.end, p1);

        if (Vector2.testLength(diff, LARGEST_NEGLECTED_GAP_FIRST_PHASE)) {
            if (segmentIdx === startSegmentIdx) {
                return startSegmentIdx;
            }
            if (this.slicerSegments[segmentIdx].addedToPolygon) {
                return -1;
            }
            return segmentIdx;
        }

        return -1;
    }
}

export class Slicer {
    slicerLayers = [];

    mesh;

    constructor(mesh, layerThickness, sliceLayerCount, initialLayerThickness) {
        this.mesh = mesh;

        this.buildLayersWithHeight(layerThickness, sliceLayerCount, initialLayerThickness);
        const zbbox = this.buildZHeightsForFaces(mesh);

        this.buildSegments(mesh, zbbox);

        this.makePolygons(mesh);
    }


    buildLayersWithHeight(layerThickness, sliceLayerCount, initialLayerThickness) {
        this.slicerLayers[0] = new SlicerLayer();
        this.slicerLayers[0].z = Math.max(0, initialLayerThickness - layerThickness);

        this.slicerLayers[0].z = initialLayerThickness / 2;
        const adjustedLayerOffset = initialLayerThickness + (layerThickness / 2);

        for (let i = 1; i < sliceLayerCount; i++) {
            this.slicerLayers[i] = new SlicerLayer();
            this.slicerLayers[i].z = adjustedLayerOffset + (layerThickness * (i - 1));
        }
    }

    buildZHeightsForFaces(mesh) {
        const zHeights = [];
        for (const face of mesh.faces) {
            const v0 = mesh.vertices[face.vertexIndex[0]];
            const v1 = mesh.vertices[face.vertexIndex[1]];
            const v2 = mesh.vertices[face.vertexIndex[2]];

            const minZ = Math.min(v0.p.z, v1.p.z, v2.p.z);
            const maxZ = Math.max(v0.p.z, v1.p.z, v2.p.z);

            zHeights.push([minZ, maxZ]);
        }
        return zHeights;
    }

    buildSegments(mesh, zbbox) {
        for (let layerNr = 0; layerNr < this.slicerLayers.length; layerNr++) {
            const z = this.slicerLayers[layerNr].z;

            for (let faceIdx = 0; faceIdx < mesh.faces.length; faceIdx++) {
                if ((z < zbbox[faceIdx][0]) || (z > zbbox[faceIdx][1])) {
                    continue;
                }
                const face = mesh.faces[faceIdx];
                const v0 = mesh.vertices[face.vertexIndex[0]];
                const v1 = mesh.vertices[face.vertexIndex[1]];
                const v2 = mesh.vertices[face.vertexIndex[2]];
                const p0 = v0.p;
                const p1 = v1.p;
                const p2 = v2.p;

                let endEdgeIdx = -1;
                let seg;

                if (p0.z < z && p1.z >= z && p2.z >= z) {
                    seg = this.project2D(p0, p2, p1, z);
                    endEdgeIdx = 0;
                    if (p1.z === z) {
                        seg.endVertex = v1;
                    }
                } else if (p0.z > z && p1.z < z && p2.z < z) {
                    seg = this.project2D(p0, p1, p2, z);
                    endEdgeIdx = 2;
                } else if (p1.z < z && p0.z >= z && p2.z >= z) {
                    seg = this.project2D(p1, p0, p2, z);
                    endEdgeIdx = 1;
                    if (p2.z === z) {
                        seg.endVertex = v2;
                    }
                } else if (p1.z > z && p0.z < z && p2.z < z) {
                    seg = this.project2D(p1, p2, p0, z);
                    endEdgeIdx = 0;
                } else if (p2.z < z && p1.z >= z && p0.z >= z) {
                    seg = this.project2D(p2, p1, p0, z);
                    endEdgeIdx = 2;
                    if (p0.z === z) {
                        seg.endVertex = v0;
                    }
                } else if (p2.z > z && p1.z < z && p0.z < z) {
                    seg = this.project2D(p2, p0, p1, z);
                    endEdgeIdx = 1;
                } else {
                    // Not all cases create a segment, because a point of a face could create just a dot, and two touching faces
                    //  on the slice would create two segments
                    continue;
                }
                this.slicerLayers[layerNr].faceIdxToSegmentIdx.set(faceIdx, this.slicerLayers[layerNr].slicerSegments.length);
                seg.faceIndex = faceIdx;
                seg.endOtherFaceIdx = face.connectedFaceIndex[endEdgeIdx];
                seg.addedToPolygon = false;
                this.slicerLayers[layerNr].slicerSegments.push(seg);
            }
        }
    }

    project2D(p0, p1, p2, z) {
        const seg = { start: {}, end: {} };

        seg.start.x = this.interpolate(z, p0.z, p1.z, p0.x, p1.x);
        seg.start.y = this.interpolate(z, p0.z, p1.z, p0.y, p1.y);
        seg.end.x = this.interpolate(z, p0.z, p2.z, p0.x, p2.x);
        seg.end.y = this.interpolate(z, p0.z, p2.z, p0.y, p2.y);

        return seg;
    }

    interpolate(x, x0, x1, y0, y1) {
        const dx01 = x1 - x0;
        const num = (y1 - y0) * (x - x0);
        return y0 + num / dx01;
    }

    makePolygons(mesh) {
        for (const slicerLayer of this.slicerLayers) {
            slicerLayer.makePolygons(mesh);
        }
    }
}