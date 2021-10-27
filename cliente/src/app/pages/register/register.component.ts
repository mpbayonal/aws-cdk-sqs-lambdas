import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import {get,getPublicKey,hashPassword,post,setAuth,clearAuth} from '../../services/api';
import {Router} from '@angular/router';
import * as _ from 'lodash';


@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  /** email */
  cedula: string = '';
  agents: any[]=[]
  /** email */
  nombre: string = '';
  password: string = '';

  constructor(private router: Router) { }

  ngOnInit() {
    clearAuth()

  }

  onEnviar() {
    clearAuth()


    get('agents').then((agents) => {
      this.agents = agents

      console.log(agents)
      console.log(this.agents)
    })


    


    let state = {'username': this.cedula.toString(), 'email': this.nombre ,'name' : this.nombre}
    





  }

}
