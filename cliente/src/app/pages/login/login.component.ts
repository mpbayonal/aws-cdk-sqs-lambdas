import {  OnDestroy } from '@angular/core';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import {Router} from '@angular/router';
import * as _ from 'lodash';
import {get,getPublicKey,hashPassword,post,setAuth,clearAuth} from '../../services/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
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


    let cedula2 = this.cedula.toString();




    const credentials = {
      username: cedula2,
      password: hashPassword(this.password)
    }
    post('authorization', credentials)
      .then(res => {
        setAuth(res.authorization)
        this.router.navigateByUrl('/dashboard')

      })



  }

  ngOnDestroy(): void {
  }

}
