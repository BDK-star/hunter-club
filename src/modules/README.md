# 业务模块目录

每个模块只通过自己的`public.ts`向其他模块提供能力。随着模块进入实现阶段，在模块内按`domain`、`application`、`infrastructure`和`presentation`分层；不得为了占位提前创建空层。

当前`public.ts`为空是有意的：阶段1只建立可检查的边界，不发明尚未交付的业务接口。
