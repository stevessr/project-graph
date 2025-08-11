import { describe, it, expect } from "vitest";
import { serialize, deserialize, serializable, passExtraAtArg1, passObject } from "../src";

describe("Stage-level Serialization Fix", () => {
  @passExtraAtArg1
  @passObject
  class MockNode {
    @serializable
    public uuid: string;
    @serializable
    public position: { x: number; y: number };

    constructor(project: any, { uuid, position }: { uuid: string; position: { x: number; y: number } }) {
      this.uuid = uuid;
      this.position = position;
    }

    moveTo(x: number, y: number) {
      this.position.x = x;
      this.position.y = y;
    }
  }

  @passExtraAtArg1
  @passObject
  class MockEdge {
    @serializable
    public uuid: string;
    @serializable
    public associationList: MockNode[];

    constructor(project: any, { uuid, associationList }: { uuid: string; associationList: MockNode[] }) {
      this.uuid = uuid;
      this.associationList = associationList;
    }

    get source() {
      return this.associationList?.[0];
    }

    get target() {
      return this.associationList?.[1];
    }

    getConnectionPosition() {
      return {
        source: { x: this.source.position.x, y: this.source.position.y },
        target: { x: this.target.position.x, y: this.target.position.y },
      };
    }
  }

  it("should preserve object references when serializing entire stage", () => {
    const mockProject = {};

    // Create mock nodes
    const node1 = new MockNode(mockProject, {
      uuid: "node1",
      position: { x: 0, y: 0 },
    });

    const node2 = new MockNode(mockProject, {
      uuid: "node2",
      position: { x: 100, y: 0 },
    });

    // Create edge referencing the nodes
    const edge = new MockEdge(mockProject, {
      uuid: "edge1",
      associationList: [node1, node2],
    });

    // Create a stage with the objects (like Project.stage)
    const stage = [node1, node2, edge];

    // Get initial positions
    const initialPos = edge.getConnectionPosition();
    console.log("Initial positions:", initialPos);

    // Serialize the ENTIRE stage as one unit (the fix)
    const serializedStage = serialize(stage);
    console.log("Serialized stage (one unit):", JSON.stringify(serializedStage, null, 2));

    // Deserialize back as one unit
    const deserializedStage = deserialize(serializedStage, mockProject) as typeof stage;

    // Find objects in the deserialized stage
    const deserializedNode1 = deserializedStage.find((obj) => obj.uuid === "node1") as MockNode;
    const deserializedNode2 = deserializedStage.find((obj) => obj.uuid === "node2") as MockNode;
    const deserializedEdge = deserializedStage.find((obj) => obj.uuid === "edge1") as MockEdge;

    console.log("Deserialized edge source UUID:", deserializedEdge?.source?.uuid);
    console.log("Deserialized edge target UUID:", deserializedEdge?.target?.uuid);
    console.log("Are references preserved?", deserializedEdge.source === deserializedNode1);

    // Check if references are preserved (this should now work)
    expect(deserializedEdge.source).toBe(deserializedNode1);
    expect(deserializedEdge.target).toBe(deserializedNode2);

    // Move node1
    deserializedNode1.moveTo(50, 50);

    // Check if connection follows the moved node
    const newPos = deserializedEdge.getConnectionPosition();
    console.log("After move positions:", newPos);

    expect(newPos.source.x).toBe(50);
    expect(newPos.source.y).toBe(50);
    expect(newPos.target.x).toBe(100);
    expect(newPos.target.y).toBe(0);
  });
});
