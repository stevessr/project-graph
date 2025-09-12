import { transformFromAstSync } from "@babel/core";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import type { UnpluginFactory } from "unplugin";
import { createUnplugin } from "unplugin";
import type { Options } from "./types";

export const unpluginFactory: UnpluginFactory<Options | undefined> = () => {
  return {
    name: "unplugin-operator-overload",
    transform(code, id) {
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return null;

      try {
        const ast = parse(code, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
        });

        // workaround: babel不支持esm的默认导出
        ((typeof _traverse === "function" ? _traverse : (_traverse as any).default) as typeof _traverse)(ast, {
          BinaryExpression(path) {
            const { node } = path;
            const operator = node.operator;

            // 定义运算符到方法名的映射
            const operatorMap: Record<string, string> = {
              "+": "__add__",
              "-": "__sub__",
              "*": "__mul__",
              "/": "__div__",
              // "%": "__mod__",
              // "**": "__pow__",
              // "==": "__eq__",
              // "!=": "__ne__",
              // "===": "__seq__",
              // "!==": "__sne__",
              // "<": "__lt__",
              // "<=": "__le__",
              // ">": "__gt__",
              // ">=": "__ge__",
              // "<<": "__lshift__",
              // ">>": "__rshift__",
              // ">>>": "__urshift__",
              // "&": "__and__",
              // "|": "__or__",
              // "^": "__xor__",
            };

            if (operatorMap[operator]) {
              const methodName = operatorMap[operator];

              // 跳过 PrivateName 类型的操作数
              if (t.isPrivateName(node.left) || t.isPrivateName(node.right)) {
                return;
              }

              // 确保左右操作数是表达式类型
              const leftExpr = node.left as t.Expression;
              const rightExpr = node.right as t.Expression;

              // 检查左操作数是否是原始类型字面量
              if (
                t.isNumericLiteral(leftExpr) ||
                t.isStringLiteral(leftExpr) ||
                t.isBooleanLiteral(leftExpr) ||
                t.isNullLiteral(leftExpr) ||
                t.isBigIntLiteral(leftExpr)
              ) {
                // 如果是原始类型字面量，跳过转换
                return;
              }

              // 检查左操作数是否是原始类型的标识符
              if (t.isIdentifier(leftExpr)) {
                // 如果是原始类型的标识符（如undefined, NaN, Infinity等），跳过转换
                const primitiveIdentifiers = new Set(["undefined", "null", "NaN", "Infinity", "true", "false"]);
                if (primitiveIdentifiers.has(leftExpr.name)) {
                  return;
                }
              }

              // 创建新的二元表达式节点，避免递归引用
              const fallbackBinary = t.binaryExpression(operator, t.cloneNode(leftExpr), t.cloneNode(rightExpr));

              // 标记这个节点，避免再次处理
              (fallbackBinary as any)._operatorOverloadProcessed = true;

              // 创建更安全的检查条件
              const safeCheck = t.logicalExpression(
                "&&",
                t.logicalExpression(
                  "&&",
                  t.binaryExpression(
                    "!==",
                    t.unaryExpression("typeof", t.cloneNode(leftExpr)),
                    t.stringLiteral("undefined"),
                  ),
                  t.binaryExpression("!==", t.cloneNode(leftExpr), t.nullLiteral()),
                ),
                t.logicalExpression(
                  "&&",
                  t.binaryExpression(
                    "!==",
                    t.unaryExpression("typeof", t.cloneNode(leftExpr)),
                    t.stringLiteral("number"),
                  ),
                  t.logicalExpression(
                    "&&",
                    t.binaryExpression(
                      "!==",
                      t.unaryExpression("typeof", t.cloneNode(leftExpr)),
                      t.stringLiteral("string"),
                    ),
                    t.logicalExpression(
                      "&&",
                      t.binaryExpression(
                        "!==",
                        t.unaryExpression("typeof", t.cloneNode(leftExpr)),
                        t.stringLiteral("boolean"),
                      ),
                      t.binaryExpression("in", t.stringLiteral(methodName), t.cloneNode(leftExpr)),
                    ),
                  ),
                ),
              );

              // 创建条件表达式
              const conditionalExpression = t.conditionalExpression(
                safeCheck,
                t.callExpression(t.memberExpression(t.cloneNode(leftExpr), t.identifier(methodName)), [
                  t.cloneNode(rightExpr),
                ]),
                fallbackBinary,
              );

              // 标记这个节点，避免再次处理
              (conditionalExpression as any)._operatorOverloadProcessed = true;

              path.replaceWith(conditionalExpression);

              // 跳过对新节点的遍历，避免无限递归
              path.skip();
            }
          },
        });

        const result = transformFromAstSync(ast, code, {
          code: true,
          ast: false,
          sourceMaps: true,
          configFile: false,
        });

        return {
          code: result?.code || code,
          map: result?.map,
        };
      } catch (error) {
        console.error("Error transforming code:", error);
        return null;
      }
    },
  };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
