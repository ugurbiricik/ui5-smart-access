import Main from "test/controller/Main.controller";

QUnit.module("Sample Main controller test");

QUnit.test("The Main controller has an openAbicsAccessibilityPopover method", function (assert) {
	assert.strictEqual(typeof Main.prototype.openAbicsAccessibilityPopover, "function");
});
