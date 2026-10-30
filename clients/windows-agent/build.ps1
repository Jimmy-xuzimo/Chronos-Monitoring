$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
$csc=Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
$refs='/reference:System.Windows.Forms.dll,System.Drawing.dll,System.Management.dll,System.Net.Http.dll,System.Web.Extensions.dll,System.Security.dll,Microsoft.CSharp.dll'
& $csc /nologo /target:winexe /optimize+ /out:WorkbenchAgent.exe $refs Agent.cs
if($LASTEXITCODE){throw 'Agent build failed'}
& $csc /nologo /target:winexe /main:Setup /optimize+ /out:WorkbenchAgentSetup.exe /resource:WorkbenchAgent.exe,AgentPayload $refs Agent.cs Setup.cs
if($LASTEXITCODE){throw 'Setup build failed'}
} finally { Pop-Location }
