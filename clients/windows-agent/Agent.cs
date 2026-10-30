using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Management;
using System.Net;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

class Config { public string Server="https://panel.example.com", Node="", Token=""; public int Interval=10; public bool Paused=false; }
static class App {
 public static string Data=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),".zimo-workbench-agent");
 public static string Home=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"Applications","ZimoWorkbenchAgent");
 public static JavaScriptSerializer Json=new JavaScriptSerializer();
 public static string Exe { get { return Path.Combine(Home,"WorkbenchAgent.exe"); } }
 public static Config Read(){try{return Json.Deserialize<Config>(Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(Path.Combine(Data,"credentials.bin")),null,DataProtectionScope.CurrentUser)));}catch{return new Config();}}
 public static void Save(Config c){Directory.CreateDirectory(Data);var p=Path.Combine(Data,"credentials.bin");File.WriteAllBytes(p+".tmp",ProtectedData.Protect(Encoding.UTF8.GetBytes(Json.Serialize(c)),null,DataProtectionScope.CurrentUser));if(File.Exists(p))File.Replace(p+".tmp",p,null);else File.Move(p+".tmp",p);}
 public static bool Auto {get {using(var k=Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))return k!=null&&k.GetValue("ZimoWorkbenchAgent")!=null;} set {using(var k=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run")){if(value)k.SetValue("ZimoWorkbenchAgent","\""+Exe+"\" --background");else k.DeleteValue("ZimoWorkbenchAgent",false);}}}
 public static void Shortcut(string name,string target,string args){var t=Type.GetTypeFromProgID("WScript.Shell");dynamic sh=Activator.CreateInstance(t);dynamic s=sh.CreateShortcut(name);s.TargetPath=target;s.Arguments=args;s.WorkingDirectory=Home;s.Save();Marshal.FinalReleaseComObject(s);Marshal.FinalReleaseComObject(sh);}
 [STAThread] public static void Main(string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;
 if(args.Contains("--install")){Install(args.Contains("--silent"));return;}if(args.Contains("--uninstall")){Uninstall();return;}
 if(args.Contains("--sample")){ConsoleSample();return;}
 bool own;using(var mutex=new Mutex(true,@"Local\ZimoWorkbenchAgent-"+Environment.UserName,out own)){if(!own){EventWaitHandle.OpenExisting(@"Local\ZimoWorkbenchAgentShow-"+Environment.UserName).Set();return;}Application.Run(new MainForm(args.Contains("--background")));}}
 public static void Install(bool silent){if(!silent&&MessageBox.Show("安装我的工作台 · 电脑采集器？\n将创建开始菜单入口并默认登录自启动。","我的工作台",MessageBoxButtons.OKCancel)!=DialogResult.OK)return;
 try{EventWaitHandle.OpenExisting(@"Local\ZimoWorkbenchAgentExit-"+Environment.UserName).Set();Thread.Sleep(1500);}catch{}
 Directory.CreateDirectory(Home);Directory.CreateDirectory(Data);
 using(var stream=typeof(App).Assembly.GetManifestResourceStream("AgentPayload")){if(stream==null)throw new Exception("安装文件不完整");using(var f=File.Create(Exe))stream.CopyTo(f);}
 var old=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"ZimoPanelAgent","config.json");
 if(!File.Exists(old)){var packages=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Packages");if(Directory.Exists(packages))foreach(var package in Directory.GetDirectories(packages,"OpenAI.Codex_*")){var candidate=Path.Combine(package,"LocalCache","Local","ZimoPanelAgent","config.json");if(File.Exists(candidate)){old=candidate;break;}}}
 if(!File.Exists(Path.Combine(Data,"credentials.bin"))&&File.Exists(old)){var d=Json.Deserialize<Dictionary<string,object>>(File.ReadAllText(old));Save(new Config{Server=(string)d["server"],Node=(string)d["node_id"],Token=(string)d["token"]});}
 File.Copy(Exe,Path.Combine(Home,"Uninstall.exe"),true);Auto=true;
 var menu=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"我的工作台采集器");Directory.CreateDirectory(menu);Shortcut(Path.Combine(menu,"我的工作台采集器.lnk"),Exe,"");Shortcut(Path.Combine(menu,"卸载.lnk"),Path.Combine(Home,"Uninstall.exe"),"--uninstall");
 using(var k=Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\ZimoWorkbenchAgent")){k.SetValue("DisplayName","我的工作台 · 电脑采集器");k.SetValue("DisplayVersion","1.0.0");k.SetValue("Publisher","Zimo");k.SetValue("InstallLocation",Home);k.SetValue("DisplayIcon",Exe);k.SetValue("UninstallString","\""+Path.Combine(Home,"Uninstall.exe")+"\" --uninstall");k.SetValue("EstimatedSize",200,RegistryValueKind.DWord);k.SetValue("NoModify",1);}
 Process.Start(Exe,silent?"--background":"");if(!silent)MessageBox.Show("安装完成。可在开始菜单或托盘中打开设置。");}
 static void Uninstall(){if(MessageBox.Show("卸载采集器？本机加密凭据将删除，服务器历史保留。","卸载",MessageBoxButtons.OKCancel)!=DialogResult.OK)return;Auto=false;try{EventWaitHandle.OpenExisting(@"Local\ZimoWorkbenchAgentExit-"+Environment.UserName).Set();}catch{}Thread.Sleep(1000);
 foreach(string file in new[]{"credentials.bin","status.json","agent.log"})try{File.Delete(Path.Combine(Data,file));}catch{}
 var menu=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs),"我的工作台采集器");foreach(var n in new[]{"我的工作台采集器.lnk","卸载.lnk"})try{File.Delete(Path.Combine(menu,n));}catch{}try{Directory.Delete(menu);}catch{}
 Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\ZimoWorkbenchAgent",false);
 // Delete the fixed installation files after this uninstaller exits, without a visible shell.
 var script=Path.Combine(Path.GetTempPath(),"workbench-uninstall-"+Guid.NewGuid().ToString("N")+".ps1");File.WriteAllText(script,"Start-Sleep -Seconds 2\r\nRemove-Item -LiteralPath '"+Exe.Replace("'","''")+"','"+Path.Combine(Home,"Uninstall.exe").Replace("'","''")+"' -Force -ErrorAction SilentlyContinue\r\nRemove-Item -LiteralPath $PSCommandPath -Force",new UTF8Encoding(true));Process.Start(new ProcessStartInfo("powershell.exe","-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File \""+script+"\""){UseShellExecute=false,CreateNoWindow=true});}
 static void ConsoleSample(){Directory.CreateDirectory(Data);var m=new Metrics();m.Collect();Thread.Sleep(1100);File.WriteAllText(Path.Combine(Data,"sample.json"),Json.Serialize(m.Collect()));}
}

class MainForm:Form {
 Config cfg=App.Read(); TextBox server=new TextBox(),node=new TextBox(),token=new TextBox();NumericUpDown interval=new NumericUpDown();CheckBox auto=new CheckBox(),pause=new CheckBox();Label status=new Label(),metrics=new Label();NotifyIcon tray;bool quitting=false;SemaphoreSlim gate=new SemaphoreSlim(1,1);Metrics monitor;System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();DateTime next=DateTime.MinValue;EventWaitHandle showEvent,exitEvent;
 public MainForm(bool background){Text="我的工作台 · 电脑采集器";Font=new Font("Microsoft YaHei UI",10);BackColor=Color.FromArgb(245,248,252);ForeColor=Color.FromArgb(30,42,60);ClientSize=new Size(560,540);MinimumSize=new Size(576,579);StartPosition=FormStartPosition.CenterScreen;Icon=SystemIcons.Application;
 var grid=new TableLayoutPanel{Dock=DockStyle.Fill,Padding=new Padding(24),ColumnCount=2,RowCount=11};grid.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute,105));grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent,100));Controls.Add(grid);
 var title=new Label{Text="电脑脉搏",Font=new Font(Font.FontFamily,22,FontStyle.Bold),AutoSize=true};grid.Controls.Add(title,0,0);grid.SetColumnSpan(title,2);
 status.Text="准备采集…";status.AutoSize=true;status.MaximumSize=new Size(500,65);grid.Controls.Add(status,0,1);grid.SetColumnSpan(status,2);metrics.AutoSize=true;grid.Controls.Add(metrics,0,2);grid.SetColumnSpan(metrics,2);
 AddField(grid,"服务器",server,3);server.Text=cfg.Server;AddField(grid,"设备 ID",node,4);node.Text=cfg.Node;AddField(grid,"接入 Token",token,5);token.Text=cfg.Token;token.UseSystemPasswordChar=true;
 interval.Minimum=10;interval.Maximum=120;interval.Value=Math.Max(10,Math.Min(120,cfg.Interval));AddField(grid,"间隔 / 秒",interval,6);
 auto.Text="登录 Windows 后自动启动";auto.Checked=App.Auto;auto.AutoSize=true;grid.Controls.Add(auto,0,7);grid.SetColumnSpan(auto,2);pause.Text="暂停上传";pause.Checked=cfg.Paused;pause.AutoSize=true;grid.Controls.Add(pause,0,8);grid.SetColumnSpan(pause,2);
 var buttons=new FlowLayoutPanel{AutoSize=true,Dock=DockStyle.Fill};var save=new Button{Text="保存并应用",AutoSize=true,BackColor=Color.FromArgb(210,227,250)};save.Click+=(s,e)=>Save();var send=new Button{Text="立即上传",AutoSize=true};send.Click+=async(s,e)=>await Upload(true);var panel=new Button{Text="打开工作台",AutoSize=true};panel.Click+=(s,e)=>{Uri uri;if(Uri.TryCreate(cfg.Server,UriKind.Absolute,out uri)&&uri.Scheme=="https")Process.Start(uri.AbsoluteUri);};buttons.Controls.AddRange(new Control[]{save,send,panel});grid.Controls.Add(buttons,0,9);grid.SetColumnSpan(buttons,2);
 var foot=new Label{Text="关闭窗口后继续在托盘运行 · 凭据由 Windows 加密保护\n仅向服务器上传监控数据，不开放入站端口 · v1.0.0",AutoSize=true,ForeColor=Color.DimGray};grid.Controls.Add(foot,0,10);grid.SetColumnSpan(foot,2);
 tray=new NotifyIcon{Icon=Icon,Visible=true,Text="我的工作台采集器"};var menu=new ContextMenuStrip();menu.Items.Add("打开设置",null,(s,e)=>Reveal());menu.Items.Add("立即上传",null,async(s,e)=>await Upload(true));menu.Items.Add("退出",null,(s,e)=>Quit());tray.ContextMenuStrip=menu;tray.DoubleClick+=(s,e)=>Reveal();FormClosing+=(s,e)=>{if(!quitting){e.Cancel=true;Hide();}};
 showEvent=new EventWaitHandle(false,EventResetMode.AutoReset,@"Local\ZimoWorkbenchAgentShow-"+Environment.UserName);exitEvent=new EventWaitHandle(false,EventResetMode.AutoReset,@"Local\ZimoWorkbenchAgentExit-"+Environment.UserName);
 timer.Interval=1000;timer.Tick+=async(s,e)=>{if(showEvent.WaitOne(0))Reveal();if(exitEvent.WaitOne(0)){Quit();return;}if(DateTime.UtcNow>=next){next=DateTime.UtcNow.AddSeconds(cfg.Interval);await Upload(false);}};timer.Start();Shown+=(s,e)=>{if(background)Hide();};}
 void AddField(TableLayoutPanel g,string name,Control c,int row){g.Controls.Add(new Label{Text=name,AutoSize=true,Anchor=AnchorStyles.Left},0,row);c.Dock=DockStyle.Fill;c.Margin=new Padding(3,5,3,5);g.Controls.Add(c,1,row);}
 void Reveal(){Show();WindowState=FormWindowState.Normal;Activate();} void Quit(){quitting=true;timer.Stop();tray.Visible=false;tray.Dispose();Close();}
 void Save(){Uri uri;if(!Uri.TryCreate(server.Text.Trim(),UriKind.Absolute,out uri)||uri.Scheme!="https"||!string.IsNullOrEmpty(uri.UserInfo)||uri.AbsolutePath!="/"||!string.IsNullOrEmpty(uri.Query)||!string.IsNullOrEmpty(uri.Fragment)||string.IsNullOrWhiteSpace(node.Text)||string.IsNullOrWhiteSpace(token.Text)){MessageBox.Show("请填写 HTTPS 根地址、设备 ID 和接入 Token。");return;}cfg=new Config{Server=uri.AbsoluteUri.TrimEnd('/'),Node=node.Text.Trim(),Token=token.Text.Trim(),Interval=(int)interval.Value,Paused=pause.Checked};try{App.Save(cfg);App.Auto=auto.Checked;next=DateTime.MinValue;status.Text="配置已保存";}catch{MessageBox.Show("保存失败，请检查本机目录权限。");}}
 async Task Upload(bool manual){if(!await gate.WaitAsync(0))return;var c=cfg;try{if(c.Paused){status.Text="已暂停上传";return;}if(string.IsNullOrWhiteSpace(c.Token)){status.Text="请配置服务器接入凭据";return;}var result=await Task.Run(async()=>{if(monitor==null)monitor=new Metrics();var sample=monitor.Collect();using(var handler=new HttpClientHandler{AllowAutoRedirect=false})using(var http=new HttpClient(handler){Timeout=TimeSpan.FromSeconds(12)}){http.DefaultRequestHeaders.Authorization=new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer",c.Token);using(var response=await http.PostAsync(c.Server.TrimEnd('/')+"/api/agent/report",new StringContent(App.Json.Serialize(sample),Encoding.UTF8,"application/json"))){if(!response.IsSuccessStatusCode)throw new Exception("HTTP "+(int)response.StatusCode);}}return sample;});status.Text="上传成功 · "+DateTime.Now.ToString("HH:mm:ss");metrics.Text=monitor.Summary;WriteStatus("online",null);}catch(Exception e){status.Text="上传失败 · "+(e.Message.StartsWith("HTTP ")?e.Message:"网络或采集异常，稍后重试");WriteStatus("retrying",e.GetType().Name);}finally{gate.Release();}}
 void WriteStatus(string state,string error){try{Directory.CreateDirectory(App.Data);File.WriteAllText(Path.Combine(App.Data,"status.json"),App.Json.Serialize(new{state=state,last_attempt=DateTimeOffset.UtcNow.ToUnixTimeSeconds(),node_id=cfg.Node,error_type=error}));}catch{}}
}

class Metrics {
 [StructLayout(LayoutKind.Sequential)]class Memory{public uint Length=(uint)Marshal.SizeOf(typeof(Memory));public uint Load;public ulong Total,Available,PageTotal,PageAvailable,VirtualTotal,VirtualAvailable,Extended;}
 [DllImport("kernel32.dll")]static extern bool GlobalMemoryStatusEx([In,Out]Memory m);
 [DllImport("kernel32.dll")]static extern ulong GetTickCount64();
 string os=Environment.OSVersion.ToString(),cpu=Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER");DateTime previous=DateTime.UtcNow;Dictionary<string,long[]> networks=new Dictionary<string,long[]>();Dictionary<int,double> proc=new Dictionary<int,double>();public string Summary="";
 public Metrics(){try{foreach(ManagementObject o in new ManagementObjectSearcher("SELECT Caption FROM Win32_OperatingSystem").Get())os=Convert.ToString(o["Caption"]);foreach(ManagementObject o in new ManagementObjectSearcher("SELECT Name FROM Win32_Processor").Get())cpu=Convert.ToString(o["Name"]);}catch{}}
 static double N(object o){return Math.Max(0,Convert.ToDouble(o));}
 public object Collect(){var now=DateTime.UtcNow;double elapsed=Math.Max(.1,(now-previous).TotalSeconds);var cores=new SortedDictionary<int,double>();foreach(ManagementObject o in new ManagementObjectSearcher("SELECT Name,PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor").Get()){int n;if(int.TryParse((string)o["Name"],out n))cores[n]=Math.Min(100,N(o["PercentProcessorTime"]));}
 var mem=new Memory();if(!GlobalMemoryStatusEx(mem))throw new Exception("Memory sample failed");double swapTotal=0,swapUsed=0;try{foreach(ManagementObject o in new ManagementObjectSearcher("SELECT AllocatedBaseSize,CurrentUsage FROM Win32_PageFileUsage").Get()){swapTotal+=N(o["AllocatedBaseSize"])*1048576;swapUsed+=N(o["CurrentUsage"])*1048576;}}catch{}
 var ifaces=new List<object>();double tx=0,rx=0,totalTx=0,totalRx=0;foreach(var nic in NetworkInterface.GetAllNetworkInterfaces().Where(n=>n.NetworkInterfaceType!=NetworkInterfaceType.Loopback)){try{var n=nic.GetIPv4Statistics();long[] old;networks.TryGetValue(nic.Id,out old);double sent=old==null?0:Math.Max(0,(n.BytesSent-old[0])/elapsed),received=old==null?0:Math.Max(0,(n.BytesReceived-old[1])/elapsed);networks[nic.Id]=new[]{n.BytesSent,n.BytesReceived};tx+=sent;rx+=received;totalTx+=n.BytesSent;totalRx+=n.BytesReceived;ifaces.Add(new{name=nic.Name,addresses=nic.GetIPProperties().UnicastAddresses.Select(a=>a.Address.ToString()).ToArray(),tx=sent,rx=received,total_tx=n.BytesSent,total_rx=n.BytesReceived});}catch{}}
 var io=new Dictionary<string,double[]>();try{foreach(ManagementObject o in new ManagementObjectSearcher("SELECT Name,DiskReadBytesPersec,DiskWriteBytesPersec FROM Win32_PerfFormattedData_PerfDisk_LogicalDisk").Get())io[Convert.ToString(o["Name"])]=new[]{N(o["DiskReadBytesPersec"]),N(o["DiskWriteBytesPersec"])};}catch{}
 var disks=new List<object>();foreach(var d in DriveInfo.GetDrives().Where(d=>d.DriveType==DriveType.Fixed&&d.IsReady)){double[] v;if(!io.TryGetValue(d.Name.TrimEnd('\\'),out v))v=new double[]{0,0};disks.Add(new{mount=d.Name,device=d.Name,total=d.TotalSize,used=d.TotalSize-d.TotalFreeSpace,percent=Math.Round(100.0*(d.TotalSize-d.TotalFreeSpace)/d.TotalSize,1),io=new{r=v[0],w=v[1]}});}
 var processes=new List<Proc>();var fresh=new Dictionary<int,double>();foreach(var p in Process.GetProcesses()){using(p){try{if(p.Id==0)continue;double total=p.TotalProcessorTime.TotalSeconds,old;processes.Add(new Proc{pid=p.Id,name=p.ProcessName,cpu=proc.TryGetValue(p.Id,out old)?Math.Max(0,(total-old)/elapsed*100):0,memory=p.WorkingSet64});fresh[p.Id]=total;}catch{}}}proc=fresh;int est=0,lsn=0;try{est=IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpConnections().Count(c=>c.State==TcpState.Established);lsn=IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpListeners().Length;}catch{}
 previous=now;double usage=cores.Count==0?0:Math.Round(cores.Values.Average(),1);Summary=string.Format("CPU {0:F1}%    内存 {1}%    ↓ {2:F0} KB/s",usage,mem.Load,rx/1024);
 return new{cpu=new{total=usage,percpu=cores.Values.ToArray()},mem=new{percent=(double)mem.Load,used=mem.Total-mem.Available,total=mem.Total,available=mem.Available},swap=new{percent=swapTotal==0?0:swapUsed/swapTotal*100,used=swapUsed,total=swapTotal},net=new{tx=tx,rx=rx,total_tx=totalTx,total_rx=totalRx,ifaces=ifaces,conns=new{est=est,lsn=lsn}},disks=disks,processes=processes.OrderByDescending(p=>p.cpu).ThenByDescending(p=>p.memory).Take(12).ToArray(),system=new{os=os,cpu_model=cpu,hostname=Environment.MachineName,kernel=Environment.OSVersion.VersionString,boot_time=now.AddMilliseconds(-(double)GetTickCount64()).ToString("o"),uptime=GetTickCount64()/1000,procs=processes.Count,cpu_cores=Environment.ProcessorCount,load=new double[0],server_time=now.ToString("o"),public_ip=""},sampled_at=DateTimeOffset.UtcNow.ToUnixTimeSeconds()};}
 class Proc{public int pid;public string name;public double cpu;public long memory;}
}
