import { describe, it, expect, beforeEach } from "vitest";
import { Project } from "../src/core/Project";
import { TextNode } from "../src/core/stage/stageObject/entity/TextNode";
import { LineEdge } from "../src/core/stage/stageObject/association/LineEdge";
import { Vector } from "@graphif/data-structures";
import { CollisionBox } from "../src/core/stage/stageObject/collisionBox/collisionBox";
import { Rectangle } from "@graphif/shapes";
import { URI } from "vscode-uri";
import { serialize, deserialize } from "@graphif/serializer";

describe("Connection Preservation Test", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project(URI.parse("draft:test"));
  });

  it("should preserve connections after serialization/deserialization", () => {
    // Create two text nodes
    const node1 = new TextNode(project, {
      uuid: "node1",
      text: "Node 1",
      collisionBox: new CollisionBox([new Rectangle(new Vector(0, 0), new Vector(100, 50))]),
    });

    const node2 = new TextNode(project, {
      uuid: "node2",
      text: "Node 2",
      collisionBox: new CollisionBox([new Rectangle(new Vector(200, 0), new Vector(100, 50))]),
    });

    // Create a connection between them
    const edge = new LineEdge(project, {
      uuid: "edge1",
      text: "Connection",
      associationList: [node1, node2],
    });

    // Add to project stage
    project.stage = [node1, node2, edge];

    // Verify initial connection positions
    const initialSourcePos = edge.sourceLocation;
    const initialTargetPos = edge.targetLocation;

    console.log("Initial source position:", initialSourcePos);
    console.log("Initial target position:", initialTargetPos);
    console.log("Initial edge source reference:", edge.source?.uuid);
    console.log("Initial edge target reference:", edge.target?.uuid);

    // Serialize project stage (simulate saving)
    const serializedStage = project.stage.map((stageObject) => serialize(stageObject));

    // Create new project and deserialize (simulate loading)
    const newProject = new Project(URI.parse("draft:test2"));
    const deserializedObjects = serializedStage.map((serialized) => deserialize(serialized, newProject));

    newProject.stage = deserializedObjects;

    // Find the deserialized objects
    const deserializedNode1 = newProject.stage.find((obj) => obj.uuid === "node1") as TextNode;
    const deserializedNode2 = newProject.stage.find((obj) => obj.uuid === "node2") as TextNode;
    const deserializedEdge = newProject.stage.find((obj) => obj.uuid === "edge1") as LineEdge;

    console.log("Deserialized edge source reference:", deserializedEdge?.source?.uuid);
    console.log("Deserialized edge target reference:", deserializedEdge?.target?.uuid);

    // Verify that references exist
    expect(deserializedNode1).toBeDefined();
    expect(deserializedNode2).toBeDefined();
    expect(deserializedEdge).toBeDefined();

    // Move the first node
    deserializedNode1.moveTo(new Vector(50, 100));

    // Check if connection followed the node
    const newSourcePos = deserializedEdge.sourceLocation;
    const newTargetPos = deserializedEdge.targetLocation;

    console.log("After move source position:", newSourcePos);
    console.log("After move target position:", newTargetPos);

    // The connection should move with the node if references are preserved
    expect(deserializedEdge.source).toBe(deserializedNode1);
    expect(deserializedEdge.target).toBe(deserializedNode2);

    // The connection positions should follow the moved node
    expect(newSourcePos.x).toBe(100); // Should be at edge of moved node (50 + 50)
    expect(newSourcePos.y).toBe(125); // Should be at center of moved node (100 + 25)
  });
});
